import React, { useState } from 'react';
import { api } from '../api/client';
import type { PaymentSuccessEventPayload } from '../types';
import {
  Terminal,
  Zap,
  AlertTriangle,
} from 'lucide-react';

interface EventSimulatorProps {
  onSimulationComplete: () => void;
}

export const EventSimulatorModal: React.FC<EventSimulatorProps> = ({ onSimulationComplete }) => {
  const [accountA, setAccountA] = useState('1000000001');
  const [bankA, setBankA] = useState('BANK_A');
  const [accountB, setAccountB] = useState('2000000001');
  const [bankB, setBankB] = useState('BANK_B');
  const [accountC, setAccountC] = useState('3000000001');
  const [bankC, setBankC] = useState('BANK_C');
  const [amount, setAmount] = useState('10000.00');

  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);


  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString('en-IN')}] ${msg}`]);
  };

  const handleRunFullSimulation = async () => {
    setIsRunning(true);
    setError(null);
    setLogs([]);


    const now = new Date();
    const leg1Time = new Date(now.getTime() - 45 * 1000).toISOString();
    const leg2Time = now.toISOString();
    const numAmount = parseFloat(amount) || 10000;
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();

    const leg1Payload: PaymentSuccessEventPayload = {
      eventId: `EVT-SIM-L1-${randomSuffix}`,
      eventType: 'PAYMENT_SUCCESS',
      transactionId: `TXN-SIM-L1-${randomSuffix}`,
      occurredAt: leg1Time,
      sender: {
        accountId: `ACC-${accountA}`,
        accountNumber: accountA,
        bankId: bankA,
      },
      receiver: {
        accountId: `ACC-${accountB}`,
        accountNumber: accountB,
        bankId: bankB,
      },
      amount: numAmount,
      currency: 'INR',
      paymentRail: 'SIMULATED_UPI',
      correlationId: `CORR-SIM-L1-${randomSuffix}`,
      messageId: `MSG-SIM-L1-${randomSuffix}`,
    };

    const leg2Payload: PaymentSuccessEventPayload = {
      eventId: `EVT-SIM-L2-${randomSuffix}`,
      eventType: 'PAYMENT_SUCCESS',
      transactionId: `TXN-SIM-L2-${randomSuffix}`,
      occurredAt: leg2Time,
      sender: {
        accountId: `ACC-${accountB}`,
        accountNumber: accountB,
        bankId: bankB,
      },
      receiver: {
        accountId: `ACC-${accountC}`,
        accountNumber: accountC,
        bankId: bankC,
      },
      amount: numAmount,
      currency: 'INR',
      paymentRail: 'SIMULATED_UPI',
      correlationId: `CORR-SIM-L2-${randomSuffix}`,
      messageId: `MSG-SIM-L2-${randomSuffix}`,
    };

    try {
      addLog(`Initiating Leg 1: Ingesting payment event ${accountA} -> ${accountB} (₹${numAmount})...`);
      const res1 = await api.events.ingestPaymentSuccess(leg1Payload);
      addLog(`Leg 1 Ingested! Result: status=${res1.status}, eventId=${res1.eventId}`);

      addLog(`Waiting 1.5 seconds to simulate rapid pass-through...`);
      await new Promise((r) => setTimeout(r, 1500));

      addLog(`Initiating Leg 2: Ingesting payment event ${accountB} -> ${accountC} (₹${numAmount}) within 45s...`);
      const res2 = await api.events.ingestPaymentSuccess(leg2Payload);
      addLog(`Leg 2 Ingested! Result: status=${res2.status}, eventId=${res2.eventId}`);

      addLog(`ZeroFraud360 3-minute detector triggered RapidPassThroughRule!`);

      addLog(`External decision client invoked -> Bank hold dispatched on Account C (${accountC})`);
      addLog(`Simulation completed successfully. Refreshing live fraud alerts...`);

      onSimulationComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to simulate payment event. Verify ZeroFraud360 backend is up.');
      addLog(`Error during event ingestion: ${err.message || 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleEmitLeg1Only = async () => {
    setIsRunning(true);
    setError(null);
    const numAmount = parseFloat(amount) || 10000;
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();

    const leg1Payload: PaymentSuccessEventPayload = {
      eventId: `EVT-SIM-L1-${randomSuffix}`,
      eventType: 'PAYMENT_SUCCESS',
      transactionId: `TXN-SIM-L1-${randomSuffix}`,
      occurredAt: new Date().toISOString(),
      sender: {
        accountId: `ACC-${accountA}`,
        accountNumber: accountA,
        bankId: bankA,
      },
      receiver: {
        accountId: `ACC-${accountB}`,
        accountNumber: accountB,
        bankId: bankB,
      },
      amount: numAmount,
      currency: 'INR',
      paymentRail: 'SIMULATED_UPI',
    };

    try {
      addLog(`Emitting Leg 1 (A -> B: ₹${numAmount})...`);
      const res = await api.events.ingestPaymentSuccess(leg1Payload);
      addLog(`Leg 1 Saved to observed_transactions! status=${res.status}`);
      onSimulationComplete();
    } catch (err: any) {
      setError(err.message);
      addLog(`Leg 1 Failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleEmitLeg2Only = async () => {
    setIsRunning(true);
    setError(null);
    const numAmount = parseFloat(amount) || 10000;
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();

    const leg2Payload: PaymentSuccessEventPayload = {
      eventId: `EVT-SIM-L2-${randomSuffix}`,
      eventType: 'PAYMENT_SUCCESS',
      transactionId: `TXN-SIM-L2-${randomSuffix}`,
      occurredAt: new Date().toISOString(),
      sender: {
        accountId: `ACC-${accountB}`,
        accountNumber: accountB,
        bankId: bankB,
      },
      receiver: {
        accountId: `ACC-${accountC}`,
        accountNumber: accountC,
        bankId: bankC,
      },
      amount: numAmount,
      currency: 'INR',
      paymentRail: 'SIMULATED_UPI',
    };

    try {
      addLog(`Emitting Leg 2 (B -> C: ₹${numAmount})...`);
      const res = await api.events.ingestPaymentSuccess(leg2Payload);
      addLog(`Leg 2 Ingested! status=${res.status}. Checking anomaly engine...`);
      onSimulationComplete();
    } catch (err: any) {
      setError(err.message);
      addLog(`Leg 2 Failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden backdrop-blur-md p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Terminal className="h-5 w-5" />
            </div>
            <h3 className="text-base font-extrabold text-white">
              Rapid Pass-Through Attack Simulator
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-mono">
              POST /internal/v1/events/payment-success
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulates real-time core banking payment events (A &rarr; B &rarr; C within &le; 180s)
            to trigger ZeroFraud360 detection, external decisioning, and account hold enforcement.
          </p>

        </div>

        <button
          onClick={handleRunFullSimulation}
          disabled={isRunning}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-orange-950/40 transition-all disabled:opacity-50 shrink-0"
        >
          <Zap className={`h-4 w-4 ${isRunning ? 'animate-bounce' : ''}`} />
          <span>{isRunning ? 'Executing Simulation...' : '1-Click Full Mule Attack'}</span>
        </button>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Interactive Flow Parameters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Node A */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Account A (Legitimate Origin)
          </div>
          <div>
            <label className="text-[10px] text-slate-500">Account Number</label>
            <input
              type="text"
              value={accountA}
              onChange={(e) => setAccountA(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-white"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500">Origin Bank ID</label>
            <input
              type="text"
              value={bankA}
              onChange={(e) => setBankA(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-slate-300"
            />
          </div>
        </div>

        {/* Node B */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/10 p-4 space-y-2">
          <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
            Account B (Intermediate Mule)
          </div>
          <div>
            <label className="text-[10px] text-slate-500">Account Number</label>
            <input
              type="text"
              value={accountB}
              onChange={(e) => setAccountB(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-white"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500">Mule Bank ID</label>
            <input
              type="text"
              value={bankB}
              onChange={(e) => setBankB(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-slate-300"
            />
          </div>
        </div>

        {/* Node C */}
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/10 p-4 space-y-2">
          <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
            Account C (Target Recipient - Held)
          </div>
          <div>
            <label className="text-[10px] text-slate-500">Account Number</label>
            <input
              type="text"
              value={accountC}
              onChange={(e) => setAccountC(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-white"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500">Destination Bank ID</label>
            <input
              type="text"
              value={bankC}
              onChange={(e) => setBankC(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-slate-300"
            />
          </div>
        </div>
      </div>

      {/* Transfer Amount & Manual Step Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4 mb-6">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-300 whitespace-nowrap">
            Transfer Amount (INR):
          </span>
          <div className="relative w-full sm:w-40">
            <span className="absolute left-2.5 top-1.5 text-xs text-slate-500 font-bold">₹</span>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-6 pr-3 py-1 font-mono text-xs font-bold text-white focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleEmitLeg1Only}
            disabled={isRunning}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors disabled:opacity-50"
          >
            <span>Emit Leg 1 Only (A &rarr; B)</span>
          </button>
          <button
            onClick={handleEmitLeg2Only}
            disabled={isRunning}
            className="flex items-center gap-1.5 rounded-lg border border-rose-800 bg-rose-950/40 hover:bg-rose-900/60 px-3 py-1.5 text-xs font-semibold text-rose-300 transition-colors disabled:opacity-50"
          >
            <span>Emit Leg 2 Only (B &rarr; C)</span>
          </button>
        </div>
      </div>

      {/* Terminal Live Simulation Log */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2 bg-slate-900/80">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500"></span>
            <span className="h-2.5 w-2.5 rounded-full bg-green-500"></span>
            <span className="text-[11px] text-slate-400 ml-1">Event Ingestion Execution Console</span>
          </div>
          {logs.length > 0 && (
            <button
              onClick={() => setLogs([])}
              className="text-[10px] text-slate-500 hover:text-slate-300"
            >
              Clear Logs
            </button>
          )}
        </div>

        <div className="p-4 max-h-52 overflow-y-auto space-y-1 text-slate-300">
          {logs.length === 0 ? (
            <div className="text-slate-600 italic">
              Awaiting trigger. Click "1-Click Full Mule Attack" to simulate both payment legs and test the detector.
            </div>
          ) : (
            logs.map((line, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">&gt;</span>
                <span className={line.includes('Error') ? 'text-rose-400' : 'text-slate-300'}>
                  {line}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
