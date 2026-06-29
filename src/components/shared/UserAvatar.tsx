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
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base font-bold',
  };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`${name}'s avatar`}
        className={`${sizeClasses[size]} rounded-full object-cover border border-gray-200 shrink-0`}
      />
    );
  }

  return (
    <div className={`flex items-center justify-center rounded-full shrink-0 border border-indigo-200 bg-indigo-50 text-indigo-700 font-semibold ${sizeClasses[size]}`}>
      {initials}
    </div>
  );
}
