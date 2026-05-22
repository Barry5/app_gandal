export interface WhatsAppMessage {
  date: string;
  time: string;
  sender: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'link';
  mediaUrl?: string;
  mediaName?: string;
}

export interface WhatsAppImportResult {
  messages: WhatsAppMessage[];
  participants: string[];
  dateRange: { start: string; end: string };
  media: { images: number; videos: number; documents: number; audio: number };
}

export interface CourseFromWhatsApp {
  title: string;
  description: string;
  modules: Array<{
    title: string;
    lessons: Array<{
      title: string;
      content: string;
      type: 'text' | 'video' | 'pdf' | 'image';
      mediaUrl?: string;
    }>;
  }>;
}

const parseDate = (dateStr: string): { date: string; time: string } | null => {
  const patterns = [
    /(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s+(\d{1,2}:\d{2})\s*(AM|PM)?/i,
    /(\d{1,2})-(\d{1,2})-(\d{2,4})\s+(\d{1,2}:\d{2})/,
    /(\d{4})\/(\d{1,2})\/(\d{1,2}),\s+(\d{1,2}:\d{2})/,
  ];

  for (const pattern of patterns) {
    const match = dateStr.match(pattern);
    if (match) {
      return { date: match[0].split(',')[0].trim(), time: match[match.length - 1] };
    }
  }
  return null;
};

const detectMediaType = (content: string): { type: WhatsAppMessage['type']; url?: string; name?: string } => {
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|heic)$/i;
  const videoExtensions = /\.(mp4|mov|avi|webm|mkv)$/i;
  const audioExtensions = /\.(mp3|wav|ogg|m4a|aac)$/i;
  const docExtensions = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i;
  const linkPattern = /^https?:\/\//i;

  if (imageExtensions.test(content)) return { type: 'image', url: content, name: content.split('/').pop() };
  if (videoExtensions.test(content)) return { type: 'video', url: content, name: content.split('/').pop() };
  if (audioExtensions.test(content)) return { type: 'audio', url: content, name: content.split('/').pop() };
  if (docExtensions.test(content)) return { type: 'document', url: content, name: content.split('/').pop() };
  if (linkPattern.test(content.trim())) return { type: 'link', url: content };

  return { type: 'text' };
};

export const parseWhatsAppChat = (content: string): WhatsAppImportResult => {
  const messages: WhatsAppMessage[] = [];
  const participants = new Set<string>();
  let minDate = '';
  let maxDate = '';
  const mediaCount = { images: 0, videos: 0, documents: 0, audio: 0 };

  const lines = content.split('\n');
  let currentMessage: Partial<WhatsAppMessage> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const dateMatch = line.match(/^[\[\(]?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}),?\s+(\d{1,2}:\d{2})/);
    
    if (dateMatch) {
      if (currentMessage && currentMessage.content) {
        messages.push(currentMessage as WhatsAppMessage);
      }
      
      const parsed = parseDate(line);
      if (parsed) {
        if (!minDate || parsed.date < minDate) minDate = parsed.date;
        if (!maxDate || parsed.date > maxDate) maxDate = parsed.date;
      }

      const afterDate = line.replace(dateMatch[0], '').trim();
      const colonIndex = afterDate.indexOf(':');
      
      if (colonIndex > 0) {
        const sender = afterDate.substring(0, colonIndex).trim();
        const msgContent = afterDate.substring(colonIndex + 1).trim();
        
        if (sender && sender !== 'WhatsApp') {
          participants.add(sender);
        }

        const mediaInfo = detectMediaType(msgContent);
        if (mediaInfo.type !== 'text') {
          mediaCount[mediaInfo.type + 's' as keyof typeof mediaCount]++;
        }

        currentMessage = {
          date: parsed?.date || '',
          time: parsed?.time || '',
          sender,
          content: msgContent,
          type: mediaInfo.type,
          mediaUrl: mediaInfo.url,
          mediaName: mediaInfo.name,
        };
      }
    } else if (currentMessage) {
      currentMessage.content = (currentMessage.content || '') + '\n' + line;
    }
  }

  if (currentMessage && currentMessage.content) {
    messages.push(currentMessage as WhatsAppMessage);
  }

  return {
    messages,
    participants: Array.from(participants),
    dateRange: { start: minDate, end: maxDate },
    media: mediaCount,
  };
};

export const convertToCourse = (
  result: WhatsAppImportResult,
  courseTitle: string,
  options: {
    groupBySender?: boolean;
    groupByDate?: boolean;
    includeMedia?: boolean;
  } = {}
): CourseFromWhatsApp => {
  const { groupBySender = true, includeMedia = true } = options;
  
  const modules: CourseFromWhatsApp['modules'] = [];

  if (groupBySender) {
    const senderGroups: Record<string, WhatsAppMessage[]> = {};
    result.messages.forEach(msg => {
      const sender = msg.sender || 'Inconnu';
      if (!senderGroups[sender]) senderGroups[sender] = [];
      senderGroups[sender].push(msg);
    });

    Object.entries(senderGroups).forEach(([sender, msgs]) => {
      const textMessages = msgs.filter(m => m.type === 'text' && m.content.trim());
      if (textMessages.length > 0) {
        modules.push({
          title: `Module: ${sender}`,
          lessons: textMessages.map((msg, idx) => ({
            title: msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : ''),
            content: msg.content,
            type: 'text' as const,
          })),
        });
      }
    });
  } else {
    modules.push({
      title: 'Contenu importé',
      lessons: result.messages
        .filter(m => m.type === 'text' && m.content.trim())
        .map((msg, idx) => ({
          title: msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : ''),
          content: msg.content,
          type: 'text' as const,
        })),
    });
  }

  return {
    title: courseTitle,
    description: `Cours importé depuis WhatsApp (${result.messages.length} messages, ${result.participants.length} participants)`,
    modules: modules.filter(m => m.lessons.length > 0),
  };
};

export const generateInviteLink = (courseId: string): string => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}/join/${courseId}?ref=whatsapp`;
};

export const formatPhoneForWhatsApp = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('221')) return cleaned;
  if (cleaned.startsWith('221')) return cleaned;
  return '221' + cleaned.slice(-9);
};

export default {
  parseWhatsAppChat,
  convertToCourse,
  generateInviteLink,
  formatPhoneForWhatsApp,
};