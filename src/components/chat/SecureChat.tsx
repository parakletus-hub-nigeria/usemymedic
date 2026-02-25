import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Video } from "lucide-react";
import { format } from "date-fns";

interface SecureChatProps {
  appointmentId: string;
  otherName: string;
}

const MEET_LINK_REGEX = /https?:\/\/(meet\.google\.com|zoom\.us|teams\.microsoft\.com)\S*/gi;

const SecureChat = ({ appointmentId, otherName }: SecureChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: true });
      setMessages(data ?? []);
      setLoading(false);
    };
    fetchMessages();

    const channel = supabase
      .channel(`messages-${appointmentId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `appointment_id=eq.${appointmentId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [appointmentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !user) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      appointment_id: appointmentId,
      sender_id: user.id,
      content: input.trim(),
    });
    if (!error) setInput("");
    setSending(false);
  };

  const renderContent = (content: string) => {
    const meetMatch = content.match(MEET_LINK_REGEX);
    if (meetMatch) {
      return (
        <div>
          <p className="text-sm">{content}</p>
          <a
            href={meetMatch[0]}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-sm font-medium text-accent hover:bg-accent/20 transition-colors"
          >
            <Video className="h-4 w-4" /> Join Video Call
          </a>
        </div>
      );
    }
    return <p className="text-sm">{content}</p>;
  };

  if (loading) {
    return <div className="space-y-3 p-4">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-3/4" />)}</div>;
  }

  return (
    <div className="flex flex-col h-[500px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">No messages yet. Start the conversation!</p>
        )}
        {messages.map(msg => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-lg px-3 py-2 ${isMe ? "bg-accent text-accent-foreground" : "bg-muted"}`}>
                <p className="text-xs font-medium mb-1 opacity-70">{isMe ? "You" : otherName}</p>
                {renderContent(msg.content)}
                <p className="text-[10px] mt-1 opacity-50">{format(new Date(msg.created_at), "p")}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="border-t p-3 flex gap-2">
        <Input
          placeholder="Type a message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
          disabled={sending}
        />
        <Button size="icon" onClick={sendMessage} disabled={sending || !input.trim()} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default SecureChat;
