import { useMemo, useState } from "react";
import type { AnswerCard } from "../types";

export function useAnswerPracticeController({
  answerCards,
  onMessage,
}: {
  answerCards: AnswerCard[];
  onMessage: (message: string) => void;
}) {
  const [randomPracticeAnswerId, setRandomPracticeAnswerId] = useState("");
  const [randomPracticeSpinning, setRandomPracticeSpinning] = useState(false);
  const [randomPracticeReveal, setRandomPracticeReveal] = useState(false);

  const randomPracticeCard = useMemo(
    () => answerCards.find((card) => card.id === randomPracticeAnswerId),
    [answerCards, randomPracticeAnswerId],
  );

  const startRandomAnswerPractice = () => {
    if (!answerCards.length) {
      onMessage("没有可练习的答案卡");
      return;
    }

    let pickedIndex = Math.floor(Math.random() * answerCards.length);
    if (answerCards.length > 1 && answerCards[pickedIndex]?.id === randomPracticeAnswerId) {
      pickedIndex = (pickedIndex + 1) % answerCards.length;
    }

    const picked = answerCards[pickedIndex];
    setRandomPracticeSpinning(true);
    setRandomPracticeReveal(false);
    window.setTimeout(() => {
      setRandomPracticeAnswerId(picked.id);
      setRandomPracticeSpinning(false);
      onMessage("已抽出一张临时练习卡");
    }, 520);
  };

  const toggleRandomPracticeReveal = () => {
    setRandomPracticeReveal((visible) => !visible);
  };

  return {
    randomPracticeCard,
    randomPracticeSpinning,
    randomPracticeReveal,
    startRandomAnswerPractice,
    toggleRandomPracticeReveal,
  };
}
