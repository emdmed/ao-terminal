import React from "react";
import { Button } from "../ui/button";
import { Pencil, Ban, Eye } from "lucide-react";

/**
 * Button for setting file state (modify, do-not-modify, use-as-example)
 * @param {string} type - Button type: 'modify', 'do-not-modify', 'use-as-example'
 * @param {boolean} isActive - Whether this state is currently active
 * @param {Function} onClick - Callback when button is clicked
 */
export function FileStateButton({ type, isActive, onClick }) {
  const config = {
    modify: {
      icon: Pencil,
      title: "Modify this file",
      activeClass: "bg-emerald-500 text-white hover:bg-emerald-600",
    },
    "do-not-modify": {
      icon: Ban,
      title: "Do not modify this file",
      activeClass: "bg-red-500 text-white hover:bg-red-600",
    },
    "use-as-example": {
      icon: Eye,
      title: "Use as example",
      activeClass: "bg-sky-500 text-white hover:bg-sky-600",
    },
  };

  const { icon: Icon, title, activeClass } = config[type];

  return (
    <Button
      onClick={onClick}
      size="icon-xs"
      variant={isActive ? 'default' : 'outline'}
      className={`w-6 h-6 ${isActive ? activeClass : ''}`}
      title={title}
    >
      <Icon className="w-3.5 h-3.5" />
    </Button>
  );
}
