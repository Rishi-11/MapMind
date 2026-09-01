import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  RotateCw,
  CheckCircle2,
  Trophy,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Page, Workspace } from '@/types/notebook';
import { Flashcard, QuizQuestion, ExecutiveSummary } from '@/types/learning';
import { generateFlashcards, generateQuiz, generateExecutiveSummary } from '@/lib/notebook/learningEngine';

interface StudyHubViewProps {
  workspace: Workspace;
  allPages: Page[];
  activePageId: string | null;
  onSelectPage?: (pageId: string) => void;
}

type StudyMode = 'flashcards' | 'quiz' | 'summary';

export const StudyHubView: React.FC<StudyHubViewProps> = ({
  workspace,
  allPages,
  activePageId,
}) => {
  const [studyMode, setStudyMode] = useState<StudyMode>('flashcards');
  const [selectedNotebookId, setSelectedNotebookId] = useState<string>('all');

  // Filter pages for study
  const studyPages = useMemo(() => {
    if (selectedNotebookId === 'all') return allPages;
    return allPages.filter((p) => p.notebookId === selectedNotebookId);
  }, [allPages, selectedNotebookId]);

  // Flashcards state
  const flashcards = useMemo(() => {
    const cards: Flashcard[] = [];
    studyPages.forEach((p) => {
      cards.push(...generateFlashcards(p));
    });
    return cards;
  }, [studyPages]);

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCards, setReviewedCards] = useState<Record<string, 'hard' | 'medium' | 'easy'>>({});

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(() => generateQuiz(studyPages));
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);

  // Active page summary
  const targetPage = allPages.find((p) => p.id === activePageId) || allPages[0];
  const summary: ExecutiveSummary | null = useMemo(() => {
    if (!targetPage) return null;
    return generateExecutiveSummary(targetPage);
  }, [targetPage]);

  // Flashcard rating handler
  const handleRateCard = (rating: 'hard' | 'medium' | 'easy') => {
    const card = flashcards[currentCardIndex];
    if (card) {
      setReviewedCards((prev) => ({ ...prev, [card.id]: rating }));
    }
    setIsFlipped(false);
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex((prev) => prev + 1);
    }
  };

  // Reset flashcards
  const handleResetFlashcards = () => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setReviewedCards({});
  };

  // Quiz answer handler
  const handleSelectQuizOption = (questionId: string, optionId: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleFinishQuiz = () => {
    let score = 0;
    quizQuestions.forEach((q) => {
      const selectedId = selectedAnswers[q.id];
      const correctOpt = q.options.find((o) => o.isCorrect);
      if (selectedId === correctOpt?.id) {
        score++;
      }
    });
    setQuizScore(score);
  };

  const handleRestartQuiz = () => {
    setQuizQuestions(generateQuiz(studyPages));
    setCurrentQuizIndex(0);
    setSelectedAnswers({});
    setQuizScore(null);
  };

  const currentCard = flashcards[currentCardIndex];
  const currentQuiz = quizQuestions[currentQuizIndex];

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-y-auto custom-scrollbar select-none">
      {/* Top Header & Mode Switcher */}
      <div className="h-14 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Study & Learning Hub
            </h1>
            <p className="text-[11px] text-slate-400">
              Spaced repetition flashcards, automated quizzes, and structured summaries
            </p>
          </div>
        </div>

        {/* Notebook Filter */}
        <div className="flex items-center gap-2">
          <select
            value={selectedNotebookId}
            onChange={(e) => {
              setSelectedNotebookId(e.target.value);
              setCurrentCardIndex(0);
              setIsFlipped(false);
            }}
            className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
          >
            <option value="all">All Notebooks ({allPages.length} notes)</option>
            {workspace.notebooks.map((nb) => (
              <option key={nb.id} value={nb.id}>{nb.icon} {nb.name}</option>
            ))}
          </select>

          {/* Mode Selector Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setStudyMode('flashcards')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                studyMode === 'flashcards'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              🃏 Flashcards ({flashcards.length})
            </button>
            <button
              onClick={() => setStudyMode('quiz')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                studyMode === 'quiz'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              📝 Quiz ({quizQuestions.length})
            </button>
            <button
              onClick={() => setStudyMode('summary')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                studyMode === 'summary'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              💡 Executive Summary
            </button>
          </div>
        </div>
      </div>

      {/* Main Mode Body */}
      <div className="flex-1 p-6 max-w-4xl mx-auto w-full flex flex-col justify-center">
        {/* Mode 1: Interactive 3D Flip Flashcards */}
        {studyMode === 'flashcards' && (
          <div className="w-full flex flex-col items-center space-y-6">
            {flashcards.length === 0 ? (
              <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <p className="text-sm text-slate-500">No flashcards found for current selection.</p>
              </div>
            ) : (
              <>
                {/* Progress Bar */}
                <div className="w-full max-w-md flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span>Card {currentCardIndex + 1} of {flashcards.length}</span>
                  <div className="w-36 sm:w-48 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 transition-all duration-300"
                      style={{ width: `${((currentCardIndex + 1) / flashcards.length) * 100}%` }}
                    />
                  </div>
                  <button
                    onClick={handleResetFlashcards}
                    className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    Reset ({Object.keys(reviewedCards).length})
                  </button>
                </div>

                {/* 3D Flip Card */}
                <div
                  onClick={() => setIsFlipped((prev) => !prev)}
                  className="w-full max-w-lg min-h-[260px] bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-purple-200/80 dark:border-purple-900/60 flex flex-col justify-between cursor-pointer hover:shadow-2xl transition-all duration-200 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                      {isFlipped ? '💡 ANSWER' : '❓ QUESTION'}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      from [[{currentCard?.sourcePageTitle}]]
                    </span>
                  </div>

                  <div className="my-6 text-center">
                    <p className={`text-base sm:text-lg font-medium leading-relaxed ${isFlipped ? 'text-purple-900 dark:text-purple-200 font-semibold' : 'text-slate-800 dark:text-slate-100'}`}>
                      {isFlipped ? currentCard?.answer : currentCard?.question}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1">
                      <RotateCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
                      Click anywhere to flip
                    </span>
                    <span className="font-mono text-purple-500">#{currentCard?.category}</span>
                  </div>
                </div>

                {/* Spaced Repetition Rating Buttons (Visible when flipped) */}
                {isFlipped ? (
                  <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <button
                      onClick={() => handleRateCard('hard')}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 hover:bg-red-100 transition-colors"
                    >
                      🔴 Hard (1 day)
                    </button>
                    <button
                      onClick={() => handleRateCard('medium')}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 hover:bg-amber-100 transition-colors"
                    >
                      🟡 Good (3 days)
                    </button>
                    <button
                      onClick={() => handleRateCard('easy')}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                    >
                      🟢 Easy (6 days)
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (currentCardIndex > 0) setCurrentCardIndex((prev) => prev - 1);
                        setIsFlipped(false);
                      }}
                      disabled={currentCardIndex === 0}
                      className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-40 text-slate-600 dark:text-slate-300"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setIsFlipped(true)}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all"
                    >
                      Reveal Answer
                    </button>
                    <button
                      onClick={() => {
                        if (currentCardIndex < flashcards.length - 1) setCurrentCardIndex((prev) => prev + 1);
                        setIsFlipped(false);
                      }}
                      disabled={currentCardIndex === flashcards.length - 1}
                      className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-40 text-slate-600 dark:text-slate-300"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Mode 2: Interactive Quiz */}
        {studyMode === 'quiz' && (
          <div className="w-full max-w-2xl mx-auto space-y-6">
            {quizScore !== null ? (
              // Quiz Finished Screen
              <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-purple-200 dark:border-purple-800 shadow-xl text-center space-y-4">
                <Trophy className="w-12 h-12 mx-auto text-amber-500 animate-bounce" />
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Quiz Completed!
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  You scored <span className="font-bold text-purple-600">{quizScore}</span> out of <span className="font-bold">{quizQuestions.length}</span> (
                  {Math.round((quizScore / Math.max(1, quizQuestions.length)) * 100)}%)
                </p>
                <button
                  onClick={handleRestartQuiz}
                  className="px-6 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md"
                >
                  Retake Quiz
                </button>
              </div>
            ) : (
              // Quiz Question Card
              currentQuiz && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-800 space-y-6">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Question {currentQuizIndex + 1} of {quizQuestions.length}</span>
                    <span>from [[{currentQuiz.sourcePageTitle}]]</span>
                  </div>

                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                    {currentQuiz.question}
                  </h2>

                  <div className="space-y-2.5">
                    {currentQuiz.options.map((opt) => {
                      const isSelected = selectedAnswers[currentQuiz.id] === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleSelectQuizOption(currentQuiz.id, opt.id)}
                          className={`p-4 rounded-2xl border text-xs font-medium cursor-pointer transition-all ${
                            isSelected
                              ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/50 text-purple-900 dark:text-purple-200 font-semibold shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {opt.text}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        if (currentQuizIndex > 0) setCurrentQuizIndex((prev) => prev - 1);
                      }}
                      disabled={currentQuizIndex === 0}
                      className="px-3 py-1.5 text-xs text-slate-500 disabled:opacity-40"
                    >
                      Previous
                    </button>

                    {currentQuizIndex < quizQuestions.length - 1 ? (
                      <button
                        onClick={() => setCurrentQuizIndex((prev) => prev + 1)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        Next Question
                      </button>
                    ) : (
                      <button
                        onClick={handleFinishQuiz}
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Submit & View Score
                      </button>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* Mode 3: Executive Summary */}
        {studyMode === 'summary' && summary && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-800 space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  Executive Brief
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  {summary.pageTitle}
                </h2>
              </div>
              <span className="text-xs text-slate-400">
                {summary.readingTimeMinutes} min read
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/40 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <strong className="block text-purple-900 dark:text-purple-200 font-bold mb-1">Overview:</strong>
              {summary.highLevelSummary}
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
                Core Key Takeaways
              </h3>
              <ul className="space-y-2">
                {summary.keyTakeaways.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {summary.prerequisites.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                  Prerequisites & Tags
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {summary.prerequisites.map((p, idx) => (
                    <span key={idx} className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
