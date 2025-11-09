import { useState } from "react";
import type { LessonWithStudent } from "../types";

export function useMobileLessonModal() {
  const [selectedLesson, setSelectedLesson] = useState<LessonWithStudent | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleLessonClick = (lesson: LessonWithStudent) => {
    if (window.innerWidth <= 768) {
      setSelectedLesson(lesson);
      setIsOpen(true);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedLesson(null);
  };

  return {
    selectedLesson,
    isOpen,
    handleLessonClick,
    handleClose,
  };
}