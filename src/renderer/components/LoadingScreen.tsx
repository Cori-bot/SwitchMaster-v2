import React from "react";
import { motion } from "framer-motion";
import logo from "@assets/logo.png";

const LoadingScreen: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="fixed inset-0 z-9999 bg-[#0a0a0a] flex flex-col items-center justify-center p-6"
    >
      <div className="relative">
        {/* Effet de halo derrière le logo */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 bg-blue-500 blur-[80px] rounded-full"
        />

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: 0.8,
            ease: "easeOut",
          }}
          className="relative z-10 flex flex-col items-center"
        >
          <motion.img
            src={logo}
            alt="SwitchMaster Logo"
            className="w-32 h-32 mb-8 drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]"
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <h1 className="text-4xl font-black text-white italic tracking-tighter mb-2">
            SWITCHMASTER <span className="text-blue-500">V2</span>
          </h1>

          <div className="flex items-center gap-1.5 mt-8">
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
              className="w-2 h-2 rounded-full bg-blue-500"
            />
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              className="w-2 h-2 rounded-full bg-blue-500"
            />
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
              className="w-2 h-2 rounded-full bg-blue-500"
            />
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-12 text-gray-500 font-medium text-sm tracking-widest uppercase"
      >
        Initialisation de vos comptes...
      </motion.div>
    </motion.div>
  );
};

export default LoadingScreen;
