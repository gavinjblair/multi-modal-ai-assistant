import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import MessageBubble from "./MessageBubble";

const ChatWindow = ({ messages, isLoading }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isLoading]);

  return (
    <div
      className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-3 shadow-inner overflow-y-auto min-h-[360px]"
      ref={containerRef}
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
    >
      {messages.length === 0 ? (
        <div className="grid place-items-center h-full text-slate-400 text-sm">
          Ask a question to get started. Image upload is optional.
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={`${msg.role}-${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <MessageBubble message={msg} />
            </motion.div>
          ))}
        </AnimatePresence>
      )}
      {isLoading && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs text-slate-200">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-300 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-200" />
          </span>
          Assistant is thinking<span className="animate-dots" />
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
