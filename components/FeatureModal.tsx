"use client";

import { X, Check, LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FeatureDetail {
  icon: LucideIcon;
  title: string;
  description: string;
  details: string[];
  benefits: string[];
  color: string;
  bgColor: string;
  iconColor: string;
}

interface FeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: FeatureDetail | null;
}

const FeatureModal = ({ isOpen, onClose, feature }: FeatureModalProps) => {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!feature) return null;

  const IconComponent = feature.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative bg-gradient-to-br from-shop_light_bg via-shop_light_pink to-shop_light_blue p-6 lg:p-8">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/80 hover:bg-white text-dark-color hover:text-shop_dark_blue hoverEffect shadow-lg"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-4">
                  <div
                    className={`${feature.bgColor} w-16 h-16 lg:w-20 lg:h-20 rounded-2xl flex items-center justify-center shadow-lg`}
                  >
                    <IconComponent
                      className={`w-8 h-8 lg:w-10 lg:h-10 ${feature.iconColor}`}
                    />
                  </div>
                  <div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-dark-color mb-2">
                      {feature.title}
                    </h2>
                    <p className="text-light-color text-sm lg:text-base">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 lg:p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
                {/* Details Section */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-dark-color mb-4 flex items-center gap-2">
                    <div
                      className={`w-1.5 h-6 rounded-full bg-gradient-to-b ${feature.color}`}
                    ></div>
                    How It Works
                  </h3>
                  <div className="space-y-3">
                    {feature.details.map((detail, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-3 p-4 bg-gradient-to-r from-shop_light_bg to-white rounded-xl border border-shop_light_blue/20 hover:border-shop_light_blue hoverEffect"
                      >
                        <div
                          className={`flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r ${feature.color} flex items-center justify-center mt-0.5`}
                        >
                          <span className="text-white text-xs font-bold">
                            {index + 1}
                          </span>
                        </div>
                        <p className="text-dark-text text-sm lg:text-base leading-relaxed">
                          {detail}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Benefits Section */}
                <div>
                  <h3 className="text-xl font-bold text-dark-color mb-4 flex items-center gap-2">
                    <div
                      className={`w-1.5 h-6 rounded-full bg-gradient-to-b ${feature.color}`}
                    ></div>
                    Benefits For You
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {feature.benefits.map((benefit, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + index * 0.05 }}
                        className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-shop_light_blue hover:shadow-md hoverEffect"
                      >
                        <Check
                          className={`flex-shrink-0 w-5 h-5 ${feature.iconColor} mt-0.5`}
                        />
                        <p className="text-dark-text text-sm leading-relaxed">
                          {benefit}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gradient-to-r from-shop_light_bg to-shop_light_pink border-t border-shop_light_blue/20 p-2">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-sm text-light-color">
                    <div className="w-2 h-2 bg-shop_light_green rounded-full animate-pulse"></div>
                    <span>Your satisfaction is our priority</span>
                  </div>

                  <button
                    onClick={onClose}
                    className="px-6 py-2 text-sm bg-gradient-to-r from-shop_btn_dark_green to-shop_orange hover:from-shop_orange hover:to-shop_btn_dark_green text-white/80 hover:text-white font-semibold rounded-full hover:shadow-lg hoverEffect"
                  >
                    Got it, thanks!
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FeatureModal;
