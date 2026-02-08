import { useState } from "react";
import { Send, Users, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AdminMailing = () => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("all");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: integrate with backend
  };

  return (
    <div className="rounded-xl border bg-card p-6 shadow-product">
      <h2 className="mb-1 text-lg font-bold text-foreground">Wyślij Mailing</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Wyślij wiadomość email do wybranej grupy użytkowników.
      </p>

      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <Label>Odbiorcy</Label>
          <Select value={audience} onValueChange={setAudience}>
            <SelectTrigger className="mt-1.5">
              <Users className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszyscy użytkownicy</SelectItem>
              <SelectItem value="active">Tylko aktywni</SelectItem>
              <SelectItem value="new">Nowi (ostatnie 30 dni)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="subject">Temat</Label>
          <Input
            id="subject"
            placeholder="Temat wiadomości..."
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="mt-1.5"
            required
          />
        </div>

        <div>
          <Label htmlFor="message">Treść</Label>
          <Textarea
            id="message"
            placeholder="Napisz treść wiadomości..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="mt-1.5 min-h-[200px]"
            required
          />
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-xs text-muted-foreground">
            <FileText className="mr-1 inline h-3 w-3" />
            Wiadomość zostanie wysłana do wybranych odbiorców
          </p>
          <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
            <Send className="mr-2 h-4 w-4" />
            Wyślij mailing
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminMailing;
