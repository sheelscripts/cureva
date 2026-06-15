import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileCode, 
  X, 
  RotateCcw, 
  Play, 
  CheckCircle2, 
  ChevronDown, 
  ChevronRight, 
  Award, 
  GitCommit, 
  Activity, 
  TrendingUp,
  RefreshCw
} from "lucide-react";
import { promptMetrics } from "../../mock/admin";

export default function PromptRegistryTable() {
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [yamlCollapsed, setYamlCollapsed] = useState<boolean>(true);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evalProgress, setEvalProgress] = useState<number>(0);
  const [showProgress, setShowProgress] = useState<boolean>(false);
  const [evalStatusText, setEvalStatusText] = useState<string | null>(null);
  const [rollbackStatus, setRollbackStatus] = useState<string | null>(null);

  const activePrompt = promptMetrics.find(p => p.promptId === selectedPromptId) || null;

  const getScoreColor = (score: number) => {
    if (score >= 0.85) return "text-status-safe";
    if (score >= 0.70) return "text-status-warning";
    return "text-status-danger";
  };

  const getScoreBg = (score: number) => {
    if (score >= 0.85) return "bg-status-safe/5 border-status-safe/15";
    if (score >= 0.70) return "bg-status-warning/5 border-status-warning/15";
    return "bg-status-danger/5 border-status-danger/15";
  };

  // Simulated execution of Prompt Evaluations
  const runEvaluation = () => {
    if (isEvaluating) return;
    setIsEvaluating(true);
    setShowProgress(true);
    setEvalProgress(0);
    setEvalStatusText(null);

    const interval = setInterval(() => {
      setEvalProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsEvaluating(false);
          setEvalStatusText("Evaluation completed. Model convergence optimized successfully.");
          setTimeout(() => setShowProgress(false), 2500);
          return 100;
        }
        return prev + 25;
      });
    }, 350);
  };

  const handleRollback = () => {
    setRollbackStatus("Successfully rolled back deployment to backup revision v1.1.");
    setTimeout(() => {
      setRollbackStatus(null);
    }, 3000);
  };

  const mockYamlContent = `---
prompt_id: recovery_outreach
agent_context_routing: recovery
temperature: 0.15
system_instructions: |
  You are the City Clinic Patient Care recovery model. Under strictly bound rules of the DPDP act,
  your goal is to dynamically reclaim empty calendar slots resulting from high no-show scores.
  Verify whether Priya or other candidates accept clinical scheduling within 450 seconds.
  Avoid mentioning computer internals or container environments. Use polite and humble Hindi/English terms.
  Provide clean, professional options. Do not make up mock schedules.`;

  return (
    <div className="w-full bg-bg-surface border border-border-dim rounded-sm shadow-xs select-none overflow-hidden font-sans text-xs">
      <div className="p-4 border-b border-border-dim flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-bg-subtle">
        <div>
          <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-text-tertiary block">
            Hyperparameters
          </span>
          <h4 className="text-sm font-sans font-bold text-text-primary mt-1">
            Core Prompt Registry & Version Control
          </h4>
        </div>
        <div className="text-[10px] font-mono text-text-secondary bg-bg-surface px-2.5 py-1 rounded-sm border border-border-dim">
          System Status: <span className="text-status-safe font-bold font-semibold">ALL TESTS SATISFIED</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border-dim bg-bg-subtle/40 text-text-secondary uppercase tracking-wider text-[10px] font-bold">
              <th className="py-2.5 px-4 font-sans">Prompt Trigger</th>
              <th className="py-2.5 px-4 font-sans">Target Agent</th>
              <th className="py-2.5 px-4 font-mono">Ver</th>
              <th className="py-2.5 px-4 text-center">Status</th>
              <th className="py-2.5 px-4 text-center">Eval Score</th>
              <th className="py-2.5 px-4 text-right font-mono">Runs (MTD)</th>
              <th className="py-2.5 px-4 text-right">Last Eval</th>
              <th className="py-2.5 px-4 text-right font-mono">Delta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-dim font-mono text-text-primary">
            {promptMetrics.map((prompt) => (
              <tr
                key={prompt.promptId}
                onClick={() => setSelectedPromptId(prompt.promptId)}
                className={`hover:bg-bg-subtle/20 cursor-pointer transition-colors ${
                  selectedPromptId === prompt.promptId ? "bg-bg-subtle" : ""
                }`}
              >
                <td className="py-3 px-4 font-sans font-bold text-text-primary">
                  <div className="flex items-center gap-1.5">
                    <FileCode size={13} className="text-text-secondary" />
                    <code className="bg-bg-subtle px-1.5 py-0.5 rounded-xs font-mono">{prompt.promptId}</code>
                  </div>
                </td>
                <td className="py-3 px-4 font-sans text-text-secondary">
                  {prompt.promptId.includes("triage") ? "Triage" : prompt.promptId.includes("recovery") ? "Recovery" : "Intervention"}
                </td>
                <td className="py-3 px-4 font-mono text-text-primary font-semibold">{prompt.version}</td>
                <td className="py-3 px-4 text-center">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-status-safe/5 border border-status-safe/15 text-status-safe text-[10px] font-sans font-semibold">
                    <span className="w-1.5 h-1.5 bg-status-safe rounded-full animate-pulse-dot" />
                    Active
                  </span>
                </td>
                <td className="py-3 px-4 text-center font-mono font-bold">
                  <span className={`px-2 py-0.5 rounded-sm border ${getScoreColor(prompt.evalScore)} ${getScoreBg(prompt.evalScore)}`}>
                    {prompt.evalScore.toFixed(2)}
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-mono font-medium text-text-primary">{prompt.runsThisMonth}</td>
                <td className="py-3 px-4 text-right text-text-secondary font-sans">{prompt.lastEvalDate}</td>
                <td className="py-3 px-4 text-right">
                  <span className="font-mono text-status-safe font-bold">
                    {prompt.vsPrevious}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* DETAIL DRAWER FOR ACTIVE PROMPT */}
      <AnimatePresence>
        {selectedPromptId && activePrompt && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPromptId(null)}
              className="fixed inset-0 bg-black/40 z-40"
            />

            {/* Sliding Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.28 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[600px] bg-bg-surface border-l border-border-dim z-50 flex flex-col shadow-2xl overflow-hidden font-sans text-xs text-text-primary"
            >
              {/* Header */}
              <div className="p-5 border-b border-border-dim bg-bg-subtle flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-sm bg-accent/5 flex items-center justify-center border border-border-dim">
                    <FileCode size={16} className="text-text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary font-mono">{activePrompt.promptId}</h4>
                    <span className="text-[10px] text-text-secondary block font-sans">
                      Active Deployment: <code className="text-text-primary font-bold font-mono">{activePrompt.version}</code>
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPromptId(null)}
                  className="p-1 rounded-sm border border-border-dim hover:bg-bg-subtle/80 text-text-secondary hover:text-text-primary transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Body Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                
                {rollbackStatus && (
                  <div className="p-3 bg-status-safe/10 border border-status-safe/20 rounded-sm text-status-safe font-mono font-semibold uppercase text-center">
                    {rollbackStatus}
                  </div>
                )}

                {/* Stats Summary Panel */}
                <div className="grid grid-cols-3 gap-3 font-mono">
                  <div className="bg-bg-subtle/40 border border-border-dim p-3 rounded-sm space-y-1">
                    <span className="text-[9px] uppercase font-sans font-bold text-text-tertiary block tracking-wider">Evaluation Score</span>
                    <span className={`text-xl font-bold font-mono ${getScoreColor(activePrompt.evalScore)}`}>
                      {activePrompt.evalScore.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-status-safe block font-sans font-semibold">{activePrompt.vsPrevious} from prev release</span>
                  </div>
                  <div className="bg-bg-subtle/40 border border-border-dim p-3 rounded-sm space-y-1">
                    <span className="text-[9px] uppercase font-sans font-bold text-text-tertiary block tracking-wider">A/B Test Conversion</span>
                    <span className="text-xl font-bold font-mono text-text-primary">67% vs 61%</span>
                    <span className="text-[10px] text-status-safe font-sans block font-semibold font-bold">v1.2 Winner ✓</span>
                  </div>
                  <div className="bg-bg-subtle/40 border border-border-dim p-3 rounded-sm space-y-1">
                    <span className="text-[9px] uppercase font-sans font-bold text-text-tertiary block tracking-wider">Runs Evaluated</span>
                    <span className="text-xl font-bold font-mono text-text-primary">100 cases</span>
                    <span className="text-[9.5px] text-text-secondary block font-sans">Golden dataset stable</span>
                  </div>
                </div>

                {/* Simulated Rollback or Version History Block */}
                <div className="bg-bg-subtle/40 border border-border-dim p-4 rounded-sm space-y-3">
                  <div className="flex items-center gap-1.5 text-text-primary">
                    <GitCommit size={14} className="text-status-info" />
                    <span className="font-semibold text-xs tracking-wide">Deployment Version Rollback logs</span>
                  </div>

                  <div className="space-y-2 select-none">
                    <div className="flex items-center justify-between p-2.5 bg-bg-surface border border-border-dim rounded-xs font-mono text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-status-safe" />
                        <span className="text-text-primary font-bold">{activePrompt.version}</span>
                        <span className="text-text-tertiary text-[10px] font-sans">(Active deployment)</span>
                      </div>
                      <span className="text-text-secondary">Jan 12, 16:30</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-bg-surface/50 border border-border-dim rounded-xs font-mono text-[11px] hover:border-status-info/40 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary" />
                        <span className="text-text-secondary">v1.1</span>
                        <span className="text-text-tertiary text-[10px] font-sans">(Eval score 0.78 / Archived)</span>
                      </div>
                      <span className="text-text-tertiary">Jan 05, 11:20</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-bg-surface/50 border border-border-dim rounded-xs font-mono text-[11px] hover:border-status-info/40 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary" />
                        <span className="text-text-secondary">v1.0</span>
                        <span className="text-text-tertiary text-[10px] font-sans">(Eval score 0.71 / Original)</span>
                      </div>
                      <span className="text-text-tertiary">Dec 20, 09:15</span>
                    </div>
                  </div>
                </div>

                {/* Collapsible Monospace YAML Preview */}
                <div className="p-4 bg-bg-subtle border border-border-dim rounded-sm space-y-3">
                  <button 
                    onClick={() => setYamlCollapsed(!yamlCollapsed)}
                    className="w-full flex items-center justify-between text-xs text-text-primary cursor-pointer select-none font-sans font-bold"
                  >
                    <div className="flex items-center gap-1.5">
                      <FileCode size={14} className="text-text-secondary" />
                      <span>YAML Prompt Template Preview</span>
                    </div>
                    <ChevronDown size={14} className={`transform transition-transform ${yamlCollapsed ? "" : "rotate-180"}`} />
                  </button>

                  <AnimatePresence>
                    {!yamlCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <pre className="p-3 bg-bg-surface border border-border-dim rounded-xs text-[11px] leading-relaxed text-text-secondary font-mono overflow-x-auto select-all max-h-[220px]">
                          {mockYamlContent}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Run Eval Indicator */}
                {showProgress && (
                  <div className="p-3.5 bg-bg-subtle border border-border-dim rounded-sm flex flex-col gap-2 select-none font-mono">
                    <div className="flex justify-between font-mono text-[10.5px]">
                      <span className="text-[10px] text-status-info font-sans font-bold uppercase tracking-wider block">Evaluation dataset compiling...</span>
                      <span className="text-xs font-bold text-text-primary">{evalProgress}%</span>
                    </div>
                    <div className="w-full bg-bg-surface border border-border-dim h-1.5 rounded-full overflow-hidden">
                      <div className="bg-status-info h-full transition-all duration-300" style={{ width: `${evalProgress}%` }} />
                    </div>
                    {evalStatusText && (
                      <span className="text-status-safe font-mono font-semibold text-[10px] mt-1 block">{evalStatusText}</span>
                    )}
                  </div>
                )}

              </div>

              {/* Drawer footer buttons */}
              <div className="p-4 border-t border-border-dim bg-bg-subtle flex items-center justify-between">
                <button
                  onClick={handleRollback}
                  className="px-4 py-1.5 text-[11px] rounded-sm border border-status-danger/20 hover:border-status-danger/50 bg-transparent text-status-danger font-semibold flex items-center gap-1.5 ctrl-btn cursor-pointer transition-colors"
                >
                  <RotateCcw size={12} />
                  <span>Rollback to v1.1</span>
                </button>

                <button
                  onClick={runEvaluation}
                  disabled={isEvaluating}
                  className="px-5 py-1.5 text-[11px] rounded-sm bg-accent text-bg-surface font-semibold flex items-center gap-1.5 hover:bg-opacity-95 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <RefreshCw size={12} className={isEvaluating ? "animate-spin" : ""} />
                  <span>Run Evaluation Test</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
