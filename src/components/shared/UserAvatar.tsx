import React from 'react';

interface UserAvatarProps {
  name?: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

export default function UserAvatar({ name = 'User', avatarUrl, size = 'md' }: UserAvatarProps) {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const sizeClasses = {
    sm: 'w-6 h-6 text-3xs',
    md: 'w-8 h-8 text-2xs',
    lg: 'w-10 h-10 text-xs font-bold',
  };

  const base_url = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const getFullAvatarUrl = () => {
    if (avatarUrl) {
      if (avatarUrl.startsWith('http')) return avatarUrl;
      return `${base_url}${avatarUrl}`;
    }
    return '';
  };

  if (getFullAvatarUrl()) {
    return (
      <img
        src={getFullAvatarUrl()}
        alt={`${name}'s avatar`}
        className={`${sizeClasses[size]} rounded-full object-cover border border-border-card shrink-0`}
      />
    );
  }

  return (
    <div className={`flex items-center justify-center rounded-full shrink-0 border border-primary/25 bg-primary-light text-primary font-bold ${sizeClasses[size]}`}>
      {initials}
    </div>
  );
}
