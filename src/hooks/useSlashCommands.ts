import { useState, useCallback, useEffect } from 'react';
import apiClient from '../services/api';

interface ChatMember {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  role?: string;
}

interface BotCommand {
  command: string;
  description: string;
}

const GROUP_COMMANDS = ['/mute', '/kick', '/ban', '/unmute', '/pin', '/admin'];

export function useSlashCommands(chatType: string, members: ChatMember[], isBot: boolean = false, botCommandsData: BotCommand[] = []) {
  const [command, setCommand] = useState<string>('');
  const [args, setArgs] = useState<string>('');
  const [showMemberList, setShowMemberList] = useState(false);
  const [filteredMembers, setFilteredMembers] = useState<ChatMember[]>([]);
  const [botCommands, setBotCommands] = useState<BotCommand[]>(botCommandsData);

  useEffect(() => {
    if (botCommandsData.length > 0) {
      setBotCommands(botCommandsData);
    }
  }, [botCommandsData]);

  const allCommands = isBot
    ? botCommands.map(c => `/${c.command}`)
    : GROUP_COMMANDS;

  const allCommandsWithDesc = isBot
    ? botCommands.map(c => ({ cmd: `/${c.command}`, desc: c.description }))
    : GROUP_COMMANDS.map(c => ({ cmd: c, desc: '' }));

  const handleInput = useCallback((text: string) => {
    if (!text.startsWith('/') || (chatType === 'private' && !isBot)) {
      setCommand('');
      setArgs('');
      setShowMemberList(false);
      return { showCommands: false, filteredCommands: [] as string[] };
    }

    const parts = text.split(' ');
    const cmd = parts[0].toLowerCase();
    const argText = parts.slice(1).join(' ');

    setCommand(cmd);
    setArgs(argText);

    // After /command + space, show member autocomplete (for group commands)
    if (parts.length >= 2 && GROUP_COMMANDS.includes(cmd)) {
      const searchText = argText.replace('@', '').toLowerCase();
      const filtered = members.filter(m =>
        m.username.toLowerCase().includes(searchText) ||
        (m.first_name || '').toLowerCase().includes(searchText) ||
        (m.last_name || '').toLowerCase().includes(searchText)
      );
      setFilteredMembers(filtered);
      setShowMemberList(true);
      return { showCommands: false, filteredCommands: [] as string[] };
    }

    setShowMemberList(false);

    // Show command list when typing /
    if (parts.length === 1) {
      const filtered = allCommandsWithDesc.filter(c =>
        c.cmd.startsWith(cmd) ||
        c.desc.toLowerCase().includes(cmd.replace('/', '').toLowerCase())
      );
      return { showCommands: true, filteredCommands: filtered.map(c => c.cmd) };
    }

    return { showCommands: false, filteredCommands: [] as string[] };
  }, [chatType, members, isBot, allCommands, allCommandsWithDesc]);

  const selectMember = useCallback((username: string) => {
    const newText = `${command} @${username} `;
    setArgs(`@${username}`);
    setShowMemberList(false);
    return newText;
  }, [command]);

  const reset = useCallback(() => {
    setCommand('');
    setArgs('');
    setShowMemberList(false);
    setFilteredMembers([]);
  }, []);

  return {
    command, args, showMemberList, filteredMembers, botCommands,
    handleInput, selectMember, reset, commands: allCommands,
  };
}
