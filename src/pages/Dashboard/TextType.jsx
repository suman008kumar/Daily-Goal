import React, { useEffect, useRef, useState } from "react";
import "./TextType.css";

const TextType = ({
  text = [],
  typingSpeed = 75,
  pauseDuration = 1500,
  showCursor = true,
  cursorCharacter = "|",
  deletingSpeed = 50,
  variableSpeedEnabled = false,
  variableSpeedMin = 60,
  variableSpeedMax = 120,
  cursorBlinkDuration = 0.5,
}) => {
  const texts = Array.isArray(text) ? text : [text];

  const [textIndex, setTextIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const timeoutRef = useRef(null);

  const getCurrentText = () => {
    if (!texts.length) return "";
    return String(texts[textIndex] ?? "");
  };

  const getTypingSpeed = () => {
    if (!variableSpeedEnabled) {
      return isDeleting ? deletingSpeed : typingSpeed;
    }

    const min = Math.max(
      1,
      Number(variableSpeedMin) || 60
    );

    const max = Math.max(
      min,
      Number(variableSpeedMax) || 120
    );

    return Math.floor(
      Math.random() * (max - min + 1) + min
    );
  };

  useEffect(() => {
    if (!texts.length) {
      setDisplayText("");
      return undefined;
    }

    const currentText = getCurrentText();

    const typeText = () => {
      if (!isDeleting) {
        const nextText = currentText.slice(
          0,
          displayText.length + 1
        );

        setDisplayText(nextText);

        if (nextText === currentText) {
          timeoutRef.current = setTimeout(() => {
            setIsDeleting(true);
          }, pauseDuration);

          return;
        }
      } else {
        const nextText = currentText.slice(
          0,
          Math.max(0, displayText.length - 1)
        );

        setDisplayText(nextText);

        if (nextText === "") {
          setIsDeleting(false);

          setTextIndex((prevIndex) => {
            if (texts.length <= 1) {
              return 0;
            }

            return (prevIndex + 1) % texts.length;
          });

          return;
        }
      }

      timeoutRef.current = setTimeout(
        typeText,
        getTypingSpeed()
      );
    };

    timeoutRef.current = setTimeout(
      typeText,
      getTypingSpeed()
    );

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    displayText,
    isDeleting,
    textIndex,
    texts,
    typingSpeed,
    pauseDuration,
    deletingSpeed,
    variableSpeedEnabled,
    variableSpeedMin,
    variableSpeedMax,
  ]);

  if (!texts.length) {
    return null;
  }

  return (
    <span
      className="text-type"
      aria-live="polite"
    >
      <span className="text-type__content">
        {displayText}
      </span>

      {showCursor && (
        <span
          className="text-type__cursor"
          style={{
            animationDuration: `${cursorBlinkDuration}s`,
          }}
          aria-hidden="true"
        >
          {cursorCharacter}
        </span>
      )}
    </span>
  );
};

export default TextType;