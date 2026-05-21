import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, CheckCircle, ShieldCheck, Clock, 
  CreditCard, RefreshCw, Lock, AlertTriangle, 
  Check, User, Calendar, Key, AlertCircle, Play
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Focusable } from './Focusable';

interface PaywallProps {
  daysRemaining: number;
  onClose?: () => void;
  isOverlay?: boolean;
}

export const PremiumPaywall: React.FC<PaywallProps> = ({ daysRemaining, onClose, isOverlay = false }) => {
  const buyPremium = useStore(state => state.buyPremium);
  const resetTrial = useStore(state => state.resetTrial);
  const setTrialStartDate = useStore(state => state.setTrialStartDate);
  
  // Checkout flow states
  const [step, setStep] = useState<'tiers' | 'checkout' | 'processing' | 'success'>('tiers');
  const [selectedTier, setSelectedTier] = useState<'personal' | 'studio'>('personal');
  
  // Form values
  const [email, setEmail] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVC, setCardCVC] = useState('');
  const [cardName, setCardName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const price = selectedTier === 'personal' ? '$19.99' : '$39.99';
  const tierName = selectedTier === 'personal' ? 'Afterglow Personal Lifetime' : 'Afterglow Broadcast Studio Master';

  // Format credit card input while typing
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 16) val = val.slice(0, 16);
    
    // Group in 4s
    const matches = val.match(/.{1,4}/g);
    const formatted = matches ? matches.join(' ') : '';
    setCardNumber(formatted);
    setFormError(null);
  };

  // Format expiry MM/YY while typing
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 4) val = val.slice(0, 4);
    
    if (val.length > 2) {
      setCardExpiry(`${val.slice(0, 2)}/${val.slice(2)}`);
    } else {
      setCardExpiry(val);
    }
    setFormError(null);
  };

  const handleCVCChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCardCVC(val);
    setFormError(null);
  };

  // Trigger Paywall simulated state set
  const triggerSimulationExpired = () => {
    // 16 days ago
    const sixteenDaysAgo = new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString();
    setTrialStartDate(sixteenDaysAgo);
    setStep('tiers');
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !email.includes('@')) {
      setFormError("Please enter a valid email address.");
      return;
    }
    const cleanNum = cardNumber.replace(/\s/g, '');
    if (cleanNum.length < 16) {
      setFormError("Card number must be 16 digits long.");
      return;
    }
    if (cardExpiry.length < 5) {
      setFormError("Enter expiry in MM/YY format.");
      return;
    }
    const month = parseInt(cardExpiry.split('/')[0], 10);
    if (isNaN(month) || month < 1 || month > 12) {
      setFormError("Card expiration month is invalid.");
      return;
    }
    if (cardCVC.length < 3) {
      setFormError("CVC code must be at least 3 digits.");
      return;
    }
    if (!cardName.trim()) {
      setFormError("Please enter the cardholder's name.");
      return;
    }

    setFormError(null);
    setStep('processing');
    
    // Simulate transaction clearing (2 seconds)
    setTimeout(() => {
      setStep('success');
      buyPremium();
    }, 2200);
  };

  // Detect card network type
  const getCardType = () => {
    const firstChar = cardNumber.charAt(0);
    if (firstChar === '4') return 'VISA';
    if (firstChar === '5') return 'MASTERCARD';
    if (firstChar === '3') return 'AMEX';
    if (firstChar === '6') return 'DISCOVER';
    return 'CREDIT CARD';
  };

  return (
    <div className={`fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl`} id="premium-paywall-viewport">
      
      {/* Absolute Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-afterglow-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl bg-afterglow-card border border-white/5 shadow-2xl rounded-3xl overflow-hidden flex flex-col md:flex-row relative max-h-[90vh]"
      >
        
        {/* Dynamic Left Column - Interactive Sandbox controls & Marketing */}
        <div className="w-full md:w-[42%] bg-gradient-to-b from-indigo-950/20 via-black to-black p-8 flex flex-col border-r border-white/5 relative">
          
          {/* Logo Brand heading */}
          <div className="flex items-center gap-2.5 mb-8 select-none">
            <span className="w-8 h-8 rounded-full afterglow-gradient flex items-center justify-center shadow-glow shrink-0">
              <span className="font-display font-black text-xs italic">A</span>
            </span>
            <div className="flex flex-col text-left">
              <span className="font-display text-sm font-black tracking-widest text-white leading-none">AFTERGLOW</span>
              <span className="text-[7px] font-mono text-afterglow-primary tracking-widest uppercase mt-0.5 font-bold">Premium Subscription</span>
            </div>
          </div>

          <div className="flex-grow text-left space-y-6">
            <div>
              {daysRemaining <= 0 ? (
                <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-md text-[10px] font-mono text-red-400 font-bold tracking-wider uppercase mb-3">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Trial Expired
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 bg-afterglow-primary/10 border border-afterglow-primary/20 px-2.5 py-1 rounded-md text-[10px] font-mono text-afterglow-primary font-bold tracking-wider uppercase mb-3">
                  <Clock className="w-3.5 h-3.5 shrink-0" /> {daysRemaining} Days Left in Trial
                </div>
              )}
              
              <h2 className="text-3xl font-display font-black tracking-tight text-white mt-1 leading-none">Unlock Unlimited Entertainment</h2>
              <p className="text-[11px] text-white/50 mt-3 leading-relaxed">
                Connect external portals and watch IPTV feed streams flawlessly inside our custom hardware-accelerated decoder with fluid lighting effects.
              </p>
            </div>

            <div className="space-y-3.5 pt-2">
              <div className="flex items-start gap-3">
                <div className="p-1 rounded bg-indigo-505/10 border border-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Automatic TV Guide Mapping</span>
                  <span className="text-[10px] text-white/40 block leading-tight">Sync high-fidelity electronic program guide details automatically.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1 rounded bg-indigo-505/10 border border-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Unlimited DVR Recorder Capacity</span>
                  <span className="text-[10px] text-white/40 block leading-tight">Schedule, isolate, and record streams simultaneously in the background.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1 rounded bg-indigo-505/10 border border-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Adaptive AI Video Enrichment</span>
                  <span className="text-[10px] text-white/40 block leading-tight">Clean titles, fetch plot lines, high-res posters with TMDb & Gemini integration.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Playground / Reviewer Interactive Sandbox Testing panel */}
          <div className="border border-indigo-500/10 bg-indigo-950/20 rounded-2xl p-4 text-left mt-8 space-y-3">
            <div className="flex items-center gap-1.5 text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[9px] font-mono tracking-wider font-extrabold uppercase">Reviewer Sandbox Controls</span>
            </div>
            <p className="text-[10px] text-white/40 leading-normal">
              Toggle states instantly to preview both active-trial and expired-trial scenarios:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Focusable id="btn-sand-reset" className="w-full">
                <button 
                  onClick={() => resetTrial()}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5 text-[9px] font-mono tracking-wider font-bold rounded-lg transition-all"
                >
                  Reset 15d Trial
                </button>
              </Focusable>
              
              <Focusable id="btn-sand-expire" className="w-full">
                <button 
                  onClick={triggerSimulationExpired}
                  className="w-full py-2 bg-red-950/20 hover:bg-red-900/30 text-red-300 hover:text-red-200 border border-red-500/10 text-[9px] font-mono tracking-wider font-bold rounded-lg transition-all"
                >
                  Force Expire Paywall
                </button>
              </Focusable>
            </div>
          </div>

          <div className="text-[9px] font-mono text-white/20 mt-4 flex items-center justify-between">
            <span>SECURE AES-256 PARSER</span>
            {isOverlay && onClose && (
              <Focusable id="btn-close-paywall-text">
                <button onClick={onClose} className="hover:text-white uppercase transition-colors">Keep evaluating</button>
              </Focusable>
            )}
          </div>
        </div>

        {/* Dynamic Right Column - Checkout Flow */}
        <div className="w-full md:w-[58%] p-8 flex flex-col justify-between overflow-y-auto max-h-[85vh] text-left">
          
          <AnimatePresence mode="wait">
            
            {/* Step 1: Pricing Tiers Selection */}
            {step === 'tiers' && (
              <motion.div 
                key="tiers"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full justify-between gap-6"
              >
                <div>
                  <h3 className="font-display text-xl font-bold text-white">Select License Plan</h3>
                  <p className="text-xs text-white/50 mt-1 leading-normal">One-time payment. Permanent validation. No recurring billing cycles.</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Option 1: Personal Lifetime */}
                  <Focusable id="tier-personal" className="w-full">
                    <div 
                      onClick={() => setSelectedTier('personal')}
                      className={`relative border p-5 rounded-2xl cursor-pointer transition-all flex justify-between items-center text-left ${
                        selectedTier === 'personal' 
                          ? 'bg-afterglow-primary/10 border-afterglow-primary shadow-glow' 
                          : 'bg-black/20 border-white/5 hover:border-white/10'
                      }`}
                    >
                      {selectedTier === 'personal' && (
                        <span className="absolute top-0 right-0 -translate-y-1/2 -translate-x-4 bg-afterglow-primary text-white font-mono text-[8px] tracking-wider uppercase font-bold px-2 py-0.5 rounded">Selected</span>
                      )}
                      
                      <div className="space-y-1.5 pr-4">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className={`w-4 h-4 shrink-0 transition-colors ${selectedTier === 'personal' ? 'text-afterglow-primary' : 'text-white/20'}`} />
                          <h4 className="text-xs font-bold font-mono tracking-wider text-white uppercase">Personal Lifetime Pass</h4>
                        </div>
                        <p className="text-[10px] text-white/50 leading-relaxed">
                          Permanent activation for single workstation. Includes TV guide mapping, full Afterglow Vault, standard playlist connections, and manual updates.
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono text-white/45 block">LIFETIME</span>
                        <span className="text-2xl font-bold font-mono text-white tracking-tighter leading-none">$19.99</span>
                      </div>
                    </div>
                  </Focusable>

                  {/* Option 2: Broadcast Studio Master */}
                  <Focusable id="tier-studio" className="w-full">
                    <div 
                      onClick={() => setSelectedTier('studio')}
                      className={`relative border p-5 rounded-2xl cursor-pointer transition-all flex justify-between items-center text-left ${
                        selectedTier === 'studio' 
                          ? 'bg-indigo-600/10 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]' 
                          : 'bg-black/20 border-white/5 hover:border-white/10'
                      }`}
                    >
                      {selectedTier === 'studio' && (
                        <span className="absolute top-0 right-0 -translate-y-1/2 -translate-x-4 bg-indigo-500 text-white font-mono text-[8px] tracking-wider uppercase font-bold px-2 py-0.5 rounded">Selected</span>
                      )}
                      
                      <div className="space-y-1.5 pr-4">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className={`w-4 h-4 shrink-0 transition-colors ${selectedTier === 'studio' ? 'text-indigo-400' : 'text-white/20'}`} />
                          <h4 className="text-xs font-bold font-mono tracking-wider text-white uppercase flex items-center gap-1">
                            Broadcast Studio Master
                          </h4>
                        </div>
                        <p className="text-[10px] text-white/50 leading-relaxed">
                          Elite subscription supporting IPTV hardware acceleration, background XMLTV index builders, Stalker/Xtream API proxies, unlimited parallel DVR channels, and multi-device cloud synchronization.
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono text-white/45 block">LIFETIME</span>
                        <span className="text-2xl font-bold font-mono text-white tracking-tighter leading-none">$39.99</span>
                      </div>
                    </div>
                  </Focusable>
                </div>

                <div className="flex gap-3 justify-end items-center border-t border-white/5 pt-4 mt-4">
                  {isOverlay && onClose && (
                    <Focusable id="btn-checkout-cancel">
                      <button 
                        onClick={onClose}
                        className="px-5 py-3 text-xs font-mono tracking-widest uppercase font-bold text-white/45 hover:text-white transition-colors"
                      >
                        Keep Trial Mode
                      </button>
                    </Focusable>
                  )}
                  
                  <Focusable id="btn-checkout-proceed">
                    <button 
                      onClick={() => setStep('checkout')}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-mono text-[10px] tracking-widest uppercase font-black rounded-xl transition-all shadow-glow flex items-center gap-2"
                    >
                      <span>Proceed to Payment</span>
                      <span>→</span>
                    </button>
                  </Focusable>
                </div>
              </motion.div>
            )}

            {/* Step 2: Interactive credit card form / Checkout */}
            {step === 'checkout' && (
              <motion.div 
                key="checkout"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-display text-xl font-bold text-white">Simulation Checkout</h3>
                    <p className="text-[11px] text-white/50 mt-0.5">Secure sandbox client. Do not use actual personal credit details.</p>
                  </div>
                  <Focusable id="btn-checkout-back">
                    <button 
                      onClick={() => { setStep('tiers'); setFormError(null); }}
                      className="text-[9px] font-mono uppercase tracking-widest text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/5"
                    >
                      Back to Plans
                    </button>
                  </Focusable>
                </div>

                {/* VISUAL MOCK CREDIT CARD VECTOR REPRESENTATION */}
                <div className="h-44 w-full bg-gradient-to-br from-indigo-900/60 to-purple-950/60 border border-indigo-500/20 rounded-2xl p-5 relative shadow-lg overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 p-10 bg-indigo-600/5 rounded-full blur-2xl pointer-events-none" />
                  
                  {/* Card header */}
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="font-mono text-[8px] text-indigo-300 uppercase tracking-widest leading-none">Afterglow Vault Node</span>
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider mt-1">{tierName}</span>
                    </div>
                    <span className="font-display font-black text-xs italic text-indigo-400">{getCardType()}</span>
                  </div>

                  {/* Card body */}
                  <div className="space-y-3">
                    <span className="font-mono text-lg text-white block tracking-widest text-center">
                      {cardNumber || "•••• •••• •••• ••••"}
                    </span>
                    
                    <div className="flex justify-between items-end font-mono">
                      <div>
                        <span className="text-[7px] text-white/40 uppercase block">CARD HOLDER</span>
                        <span className="text-xs text-white/80 block truncate max-w-[200px]">
                          {cardName.toUpperCase() || "NAME SURNAME"}
                        </span>
                      </div>
                      <div className="flex gap-4">
                        <div>
                          <span className="text-[7px] text-white/40 uppercase block">EXPIRES</span>
                          <span className="text-xs text-white/85 block">{cardExpiry || "MM/YY"}</span>
                        </div>
                        <div>
                          <span className="text-[7px] text-white/40 uppercase block">CVC</span>
                          <span className="text-xs text-white/85 block">{cardCVC || "•••"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card input forms */}
                <form onSubmit={handlePaymentSubmit} className="space-y-3 text-left">
                  {formError && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 font-mono text-[10px] flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-white/40 uppercase block">Billing Email Address</label>
                    <Focusable id="input-pay-email" className="w-full">
                      <input 
                        type="email" 
                        required
                        placeholder="you@example.com"
                        className="w-full text-xs font-mono bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500/50 text-white"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setFormError(null); }}
                        onFocus={() => useStore.getState().setFocusedElement('input-pay-email')}
                      />
                    </Focusable>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-white/40 uppercase block">Mock Credit Card Number</label>
                      <Focusable id="input-pay-card" className="w-full">
                        <input 
                          type="text" 
                          required
                          placeholder="4000 1234 5678 9010"
                          className="w-full text-xs font-mono bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500/50 text-white"
                          value={cardNumber}
                          onChange={handleCardNumberChange}
                          onFocus={() => useStore.getState().setFocusedElement('input-pay-card')}
                        />
                      </Focusable>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono text-white/40 uppercase block">Expiry Date</label>
                        <Focusable id="input-pay-exp" className="w-full">
                          <input 
                            type="text" 
                            required
                            placeholder="MM/YY"
                            className="w-full text-xs font-mono bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500/50 text-white text-center"
                            value={cardExpiry}
                            onChange={handleExpiryChange}
                            onFocus={() => useStore.getState().setFocusedElement('input-pay-exp')}
                          />
                        </Focusable>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-mono text-white/40 uppercase block">CVC Security</label>
                        <Focusable id="input-pay-cvc" className="w-full font-mono text-center">
                          <input 
                            type="password" 
                            required
                            placeholder="123"
                            maxLength={4}
                            className="w-full text-xs font-mono bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500/50 text-white text-center"
                            value={cardCVC}
                            onChange={handleCVCChange}
                            onFocus={() => useStore.getState().setFocusedElement('input-pay-cvc')}
                          />
                        </Focusable>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-white/40 uppercase block">Cardholder Family Name</label>
                    <Focusable id="input-pay-name" className="w-full">
                      <input 
                        type="text" 
                        required
                        placeholder="John Doe"
                        className="w-full text-xs font-mono bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500/50 text-white"
                        value={cardName}
                        onChange={(e) => { setCardName(e.target.value); setFormError(null); }}
                        onFocus={() => useStore.getState().setFocusedElement('input-pay-name')}
                      />
                    </Focusable>
                  </div>

                  <div className="pt-4 border-t border-white/5 mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-white/40 text-[10px] font-mono">
                      <Lock className="w-3.5 h-3.5" /> Secure SSL Connection Enabled
                    </div>

                    <Focusable id="btn-pay-submit">
                      <button 
                        type="submit"
                        className="px-6 py-3 afterglow-gradient hover:opacity-90 text-white font-mono text-[10.5px] font-bold tracking-widest uppercase rounded-xl transition-all shadow-glow flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Authorize {price} Payment</span>
                      </button>
                    </Focusable>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Step 3: Processing loading feedback */}
            {step === 'processing' && (
              <motion.div 
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center p-12 text-center gap-5 my-auto"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-indigo-400 animate-pulse" />
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-mono text-indigo-400 tracking-widest font-black uppercase">Resolving Payment gateway...</h4>
                  <p className="text-xs text-white/40 mt-1 max-w-xs mx-auto">Registering sandbox tokens and verifying card credentials with security ledger...</p>
                </div>
              </motion.div>
            )}

            {/* Step 4: Upgrade Success/Completion message! */}
            {step === 'success' && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center p-10 text-center gap-4 my-auto"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <Check className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xl font-display font-bold text-white">Afterglow Premium Unlocked!</h4>
                  <p className="text-xs text-white/50 mt-1.5 max-w-md leading-relaxed">
                    Thank you! Your payment of <span className="text-emerald-400 font-bold">{price}</span> has cleared successfully. The permanent subscription has been bound and registered to this installation database.
                  </p>
                </div>

                <div className="border border-white/5 bg-black/40 p-4 rounded-xl flex items-center gap-3 text-left w-full max-w-sm mt-2">
                  <Key className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="min-w-0 font-mono text-[9px] text-white/40">
                    <span className="font-bold text-white block uppercase">REGISTRY LICENSE CODE:</span>
                    <span className="truncate block font-black mt-0.5 tracking-wider text-emerald-300">GLOW-PREM-VOUT-XYZ-{(Math.random() * 1000000000).toFixed(0)}</span>
                  </div>
                </div>

                <Focusable id="btn-pay-complete-unlock" className="mt-4">
                  <button 
                    onClick={() => {
                      if (onClose) {
                        onClose();
                      } else {
                        setStep('tiers');
                      }
                    }}
                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/20 text-white font-mono text-[10.5px] uppercase font-black tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Engage Afterglow TV</span>
                  </button>
                </Focusable>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
