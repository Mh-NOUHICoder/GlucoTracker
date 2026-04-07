"use client";

import { motion } from "framer-motion";
import UploadButton from "@/components/UploadButton";
import { Info } from "lucide-react";

export default function UploadPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-3xl mx-auto space-y-12 pt-8"
    >
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-white">Capture Reading</h1>
        <p className="text-gray-400 max-w-xl mx-auto text-lg">
          Our AI instantly extracts the value from your glucose meter display.
        </p>
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        <UploadButton />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex items-start gap-3 p-4 rounded-xl border border-medical-blue/20 bg-medical-blue/5 text-sm text-gray-300"
      >
        <Info className="w-5 h-5 text-medical-cyan shrink-0 mt-0.5" />
        <p>
          <strong className="text-white block mb-1">For best results:</strong>
          Ensure the meter screen is clearly visible, well-lit, and without severe glare. Alternatively, you can always enter the value manually on the next step.
        </p>
      </motion.div>
    </motion.div>
  );
}
