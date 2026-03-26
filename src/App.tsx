/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { 
  Users, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft,
  Trophy,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Utensils,
  MapPin,
  Package,
  Dog,
  Briefcase,
  Trophy as TrophyIcon,
  MessageCircle,
  X,
  Settings,
  Edit2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CATEGORIES, Category } from './constants';

type GameState = 'START' | 'PLAYERS' | 'CATEGORY' | 'REVEAL_HANDOVER' | 'REVEAL' | 'QUESTIONS' | 'VOTING_TURN' | 'DRAMATIC_REVEAL' | 'DRAMATIC_REVEAL_OUT' | 'RESULT' | 'OUT_GUESS';

interface Player {
  id: string;
  name: string;
  isOut: boolean;
  votesReceived: number;
  score: number;
  votedForId?: string;
}

interface QuestionTurn {
  asker: Player;
  target: Player;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Utensils: <Utensils className="w-8 h-8 text-[#E63946]" />,
  MapPin: <MapPin className="w-8 h-8 text-[#E63946]" />,
  Package: <Package className="w-8 h-8 text-[#E63946]" />,
  Dog: <Dog className="w-8 h-8 text-[#E63946]" />,
  Briefcase: <Briefcase className="w-8 h-8 text-[#E63946]" />,
  Trophy: <TrophyIcon className="w-8 h-8 text-[#E63946]" />
};

const getAutoIcon = (name: string): keyof typeof ICON_MAP => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('طعام') || lowerName.includes('أكل') || lowerName.includes('مطعم') || lowerName.includes('فواكه') || lowerName.includes('خضار') || lowerName.includes('food')) return 'Utensils';
  if (lowerName.includes('مكان') || lowerName.includes('أماكن') || lowerName.includes('دول') || lowerName.includes('مدن') || lowerName.includes('عواصم') || lowerName.includes('بلدان') || lowerName.includes('places')) return 'MapPin';
  if (lowerName.includes('حيوان') || lowerName.includes('حيوانات') || lowerName.includes('طيور') || lowerName.includes('animals')) return 'Dog';
  if (lowerName.includes('مهنة') || lowerName.includes('مهن') || lowerName.includes('وظائف') || lowerName.includes('أعمال') || lowerName.includes('jobs')) return 'Briefcase';
  if (lowerName.includes('رياضة') || lowerName.includes('ألعاب') || lowerName.includes('بطولات') || lowerName.includes('sports')) return 'Trophy';
  return 'Package';
};

const ManageCategoriesModal = ({ isOpen, onClose, categories, addCategory, deleteCategory, newCatName, setNewCatName, newCatWords, setNewCatWords, editingCatId, editCategory, catError }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-3xl border-4 border-black w-full max-w-md max-h-[80vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-black">إدارة الفئات</h2>
          <button onClick={onClose}><X /></button>
        </div>
        <div className="space-y-4">
          <input className="w-full p-2 border-2 border-black rounded-xl" placeholder="اسم الفئة" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
          <textarea className="w-full p-2 border-2 border-black rounded-xl" placeholder="الكلمات (اكتب كل كلمة في سطر)" value={newCatWords} onChange={e => setNewCatWords(e.target.value)} rows={5} />
          {catError && <p className="text-red-500 text-sm font-bold">{catError}</p>}
          <button className="w-full bg-black text-white p-3 rounded-xl font-bold" onClick={addCategory}>
            {editingCatId ? 'تحديث الفئة' : 'إضافة فئة'}
          </button>
          <div className="space-y-3 mt-6">
            <h3 className="font-bold border-b-2 border-black pb-2">الفئات المضافة:</h3>
            {categories.length === 0 && <p className="text-gray-500 text-sm">لا توجد فئات مضافة بعد.</p>}
            {categories.map((cat: any) => (
              <div key={cat.id} className="flex flex-col p-3 border-2 border-black rounded-xl bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-lg">{cat.name}</span>
                  <div className="flex gap-2">
                    <button className="text-blue-500" onClick={() => editCategory(cat)}><Edit2 className="w-5 h-5" /></button>
                    <button className="text-red-500" onClick={() => deleteCategory(cat.id)}><Trash2 className="w-5 h-5" /></button>
                  </div>
                </div>
                <div className="text-sm text-gray-600 flex flex-wrap gap-1">
                  {cat.words.map((w: string, i: number) => (
                    <span key={i} className="bg-gray-200 px-2 py-1 rounded-md">{w}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ColorPickerModal = ({ isOpen, onClose, color, onChange }: any) => {
  if (!isOpen) return null;
  
  // Define the exact palette structure from the image (12 columns, 6 rows)
  const generatePalette = () => {
    const palette = [];
    const hues = [240, 220, 200, 180, 160, 140, 120, 100, 80, 60, 40, 20, 0, 320, 280]; // Hue spectrum
    const lightnesses = [90, 75, 60, 45, 30, 15]; // Lightness levels
    
    for (let l of lightnesses) {
      for (let h of hues) {
        palette.push(`hsl(${h}, 70%, ${l}%)`);
      }
    }
    return palette;
  };
  
  const colors = generatePalette();

  return (
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-3xl border-4 border-black w-full max-w-2xl">
        <h2 className="text-xl font-black mb-4">اختر لون الخلفية</h2>
        <div className="grid grid-cols-15 gap-0.5">
          {colors.map((c, i) => (
            <button 
              key={i} 
              className="w-8 h-8 border border-black/10 hover:scale-110 transition-transform" 
              style={{ backgroundColor: c }} 
              onClick={() => { onChange(c); onClose(); }} 
            />
          ))}
        </div>
        <button className="w-full mt-6 bg-black text-white p-3 rounded-xl font-bold" onClick={onClose}>إغلاق</button>
      </div>
    </div>
  );
};

interface ResizableBoxProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  isAdminMode: boolean;
  isEditMode: boolean;
  layoutConfig: Record<string, { width?: number; height?: number; x?: number; y?: number; scale?: number }>;
  updateLayout: (id: string, config: { width?: number; height?: number; x?: number; y?: number; scale?: number }) => void;
  key?: React.Key;
}

const ResizableBox = ({ id, children, className = '', isAdminMode, isEditMode, layoutConfig, updateLayout }: ResizableBoxProps) => {
  const boxRef = React.useRef<HTMLDivElement>(null);
  const config = layoutConfig[id] || {};

  const startInteraction = (e: React.MouseEvent | React.TouchEvent, action: string) => {
    if (!isAdminMode) return;
    e.preventDefault();
    e.stopPropagation();

    const startClientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startClientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const startWidth = boxRef.current?.offsetWidth || 0;
    const startHeight = boxRef.current?.offsetHeight || 0;
    const startX = config.x || 0;
    const startY = config.y || 0;
    const startScale = config.scale || 1;

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentClientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const currentClientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      
      const deltaX = currentClientX - startClientX;
      const deltaY = currentClientY - startClientY;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startX;
      let newY = startY;
      let newScale = startScale;

      if (action === 'move') {
        newX = startX + deltaX;
        newY = startY + deltaY;
      } else if (action === 'scale') {
        const scaleDelta = (deltaX - deltaY) * 0.005;
        newScale = Math.max(0.1, startScale + scaleDelta);
      } else {
        if (action.includes('e')) newWidth = Math.max(50, startWidth + deltaX);
        if (action.includes('s')) newHeight = Math.max(50, startHeight + deltaY);
        if (action.includes('w')) {
          const possibleWidth = startWidth - deltaX;
          if (possibleWidth >= 50) {
            newWidth = possibleWidth;
            newX = startX + deltaX;
          }
        }
        if (action.includes('n')) {
          const possibleHeight = startHeight - deltaY;
          if (possibleHeight >= 50) {
            newHeight = possibleHeight;
            newY = startY + deltaY;
          }
        }
      }

      updateLayout(id, { width: newWidth, height: newHeight, x: newX, y: newY, scale: newScale });
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  };

  const style: React.CSSProperties = {
    width: config.width ? `${config.width}px` : undefined,
    height: config.height ? `${config.height}px` : undefined,
    maxWidth: 'none',
    maxHeight: 'none',
    zIndex: isAdminMode ? 100 : 1,
  };

  return (
    <motion.div 
      ref={boxRef}
      layout
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      animate={{ x: config.x || 0, y: config.y || 0, scale: config.scale || 1 }}
      className={`relative ${className} ${isEditMode ? 'ring-2 ring-blue-400/50 ring-dashed' : ''}`}
      style={style}
    >
      {children}
      
      {isEditMode && (
        <>
          {/* Move Handle */}
          <div 
            className="absolute -top-3 -left-3 w-7 h-7 bg-blue-500 rounded-full cursor-move z-[100] border-2 border-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
            onMouseDown={(e) => startInteraction(e, 'move')}
            onTouchStart={(e) => startInteraction(e, 'move')}
          >
            <Settings className="w-4 h-4 text-white" />
          </div>

          {/* Scale Handle */}
          <div 
            className="absolute -top-3 -right-3 w-7 h-7 bg-green-500 rounded-full cursor-nesw-resize z-[100] border-2 border-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
            onMouseDown={(e) => startInteraction(e, 'scale')}
            onTouchStart={(e) => startInteraction(e, 'scale')}
          >
            <div className="w-3 h-3 border-2 border-white rounded-sm" />
          </div>

          {/* Resize Handle */}
          <div 
            className="absolute -bottom-3 -right-3 w-7 h-7 bg-blue-500 rounded-full cursor-nwse-resize z-[100] border-2 border-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform" 
            onMouseDown={(e) => startInteraction(e, 'se')} 
            onTouchStart={(e) => startInteraction(e, 'se')}
          >
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
        </>
      )}
    </motion.div>
  );
};

const DramaticRevealOut = ({ players, outIndex, onComplete }: { players: Player[], outIndex: number, onComplete: () => void }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Play enthusiastic music
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.error("Audio play failed", e));
    }

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % players.length);
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      setCurrentIndex(outIndex);
      setIsFinished(true);
      setTimeout(onComplete, 2000); // Wait 2 seconds before completing
    }, 3000); // Scroll for 3 seconds

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [players, outIndex, onComplete]);

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[300]">
      <audio ref={audioRef} src="https://actions.google.com/sounds/v1/alarms/beep_short.ogg" loop />
      <motion.div 
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-white text-4xl font-black text-center"
      >
        {players[currentIndex].name}
      </motion.div>
      {isFinished && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1.5 }}
          className="text-yellow-400 text-6xl font-black mt-8"
        >
          {players[outIndex].name} هو برا السالفة!
        </motion.div>
      )}
    </div>
  );
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => {
    try {
      const saved = localStorage.getItem('barra_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migrate old states
        if (parsed.gameState === 'SPY_GUESS') return 'OUT_GUESS';
        // Validate state
        const validStates: GameState[] = ['START', 'PLAYERS', 'CATEGORY', 'REVEAL_HANDOVER', 'REVEAL', 'QUESTIONS', 'VOTING_TURN', 'DRAMATIC_REVEAL', 'RESULT', 'OUT_GUESS'];
        if (validStates.includes(parsed.gameState)) {
          return parsed.gameState;
        }
      }
    } catch (e) {
      console.error('Error parsing barra_session', e);
    }
    return 'START';
  });
  const [players, setPlayers] = useState<Player[]>(() => {
    try {
      const sessionSaved = localStorage.getItem('barra_session');
      if (sessionSaved) {
        const parsedSession = JSON.parse(sessionSaved);
        if (parsedSession.players && Array.isArray(parsedSession.players)) {
          return parsedSession.players;
        }
      }
      const saved = localStorage.getItem('barra_players');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migrate old player structure
        if (Array.isArray(parsed)) {
          return parsed.map((p: any) => ({
            ...p,
            isOut: p.isOut ?? p.isSpy ?? false,
            votesReceived: p.votesReceived ?? 0,
            score: p.score ?? 0
          }));
        }
      }
      return [];
    } catch (e) {
      console.error('Error parsing barra_players', e);
      return [];
    }
  });
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(() => {
    try {
      const saved = localStorage.getItem('barra_session');
      return saved ? (JSON.parse(saved).selectedCategory ?? null) : null;
    } catch (e) {
      return null;
    }
  });
  const [currentWord, setCurrentWord] = useState(() => {
    try {
      const saved = localStorage.getItem('barra_session');
      return saved ? (JSON.parse(saved).currentWord ?? '') : '';
    } catch (e) {
      return '';
    }
  });
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(() => {
    try {
      const saved = localStorage.getItem('barra_session');
      return saved ? (JSON.parse(saved).currentPlayerIndex ?? 0) : 0;
    } catch (e) {
      return 0;
    }
  });
  const [currentVoterIndex, setCurrentVoterIndex] = useState(() => {
    try {
      const saved = localStorage.getItem('barra_session');
      return saved ? (JSON.parse(saved).currentVoterIndex ?? 0) : 0;
    } catch (e) {
      return 0;
    }
  });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(() => {
    try {
      const saved = localStorage.getItem('barra_session');
      return saved ? (JSON.parse(saved).currentQuestionIndex ?? 0) : 0;
    } catch (e) {
      return 0;
    }
  });
  const [questionTurns, setQuestionTurns] = useState<QuestionTurn[]>(() => {
    try {
      const saved = localStorage.getItem('barra_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed.questionTurns) ? parsed.questionTurns : [];
      }
      return [];
    } catch (e) {
      return [];
    }
  });
  const [isRevealed, setIsRevealed] = useState(() => {
    try {
      const saved = localStorage.getItem('barra_session');
      return saved ? (JSON.parse(saved).isRevealed ?? false) : false;
    } catch (e) {
      return false;
    }
  });
  const [winner, setWinner] = useState<'PLAYERS' | 'OUT' | null>(() => {
    try {
      const saved = localStorage.getItem('barra_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.winner === 'SPY') return 'OUT';
        return parsed.winner;
      }
      return null;
    } catch (e) {
      return null;
    }
  });
  const [guessResult, setGuessResult] = useState<{guess: string, isCorrect: boolean} | null>(null);
  const [revealPlayerIndex, setRevealPlayerIndex] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('barra_session');
      return saved ? (JSON.parse(saved).revealPlayerIndex ?? 0) : 0;
    } catch (e) {
      return 0;
    }
  });
  const [outGuessWord, setOutGuessWord] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('barra_session');
      return saved ? (JSON.parse(saved).outGuessWord ?? '') : '';
    } catch (e) {
      return '';
    }
  });
  const [outGuessOptions, setOutGuessOptions] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('barra_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed.outGuessOptions) ? parsed.outGuessOptions : [];
      }
      return [];
    } catch (e) {
      return [];
    }
  });
  const [showHowTo, setShowHowTo] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#40E0D0'); // Exact turquoise from image
  const [allCategories, setAllCategories] = useState<Category[]>(CATEGORIES);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatWords, setNewCatWords] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catError, setCatError] = useState('');
  const socketRef = useRef<Socket | null>(null);

  // Initialize Socket.io
  useEffect(() => {
    socketRef.current = io();

    socketRef.current.on('sync_state', (state) => {
      if (state.layoutConfig) setLayoutConfig(state.layoutConfig);
      if (state.backgroundColor) setBackgroundColor(state.backgroundColor);
      if (state.categories) setAllCategories(state.categories);
    });

    socketRef.current.on('layout_updated', (newLayout) => {
      setLayoutConfig(newLayout);
    });

    socketRef.current.on('background_updated', (newColor) => {
      setBackgroundColor(newColor);
    });

    socketRef.current.on('categories_updated', (newCategories) => {
      setAllCategories(newCategories);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // Load Settings & Categories from LocalStorage (Fallback)
  useEffect(() => {
    // Force reset settings to apply new defaults
    localStorage.removeItem('spyGameSettings');
    
    const savedCategories = localStorage.getItem('spyGameCategories');
    if (savedCategories) {
      try {
        const parsed = JSON.parse(savedCategories);
        const hasDefault = parsed.some((c: Category) => c.id === 'food');
        if (hasDefault) {
          setAllCategories(parsed);
        } else {
          const merged = [...CATEGORIES, ...parsed];
          setAllCategories(merged);
          localStorage.setItem('spyGameCategories', JSON.stringify(merged));
        }
      } catch (e) {
        console.error('Error parsing categories', e);
      }
    }
  }, []);

  const updateSession = (updates: Partial<any>) => {
    try {
      const currentSession = localStorage.getItem('barra_session');
      let parsed = {};
      if (currentSession) {
        try { parsed = JSON.parse(currentSession); } catch (e) {}
      }
      const nextSession = { ...parsed, ...updates };
      localStorage.setItem('barra_session', JSON.stringify(nextSession));
    } catch (e) {
      console.error('Error saving session', e);
    }
  };

  const updateSettings = (updates: Partial<any>) => {
    const currentSettings = localStorage.getItem('spyGameSettings');
    let parsed = {};
    if (currentSettings) {
      try { parsed = JSON.parse(currentSettings); } catch (e) {}
    }
    const newSettings = { ...parsed, ...updates };
    localStorage.setItem('spyGameSettings', JSON.stringify(newSettings));
  };

  const addCategory = () => {
    setCatError('');
    if (!newCatName) {
      setCatError('الرجاء إدخال اسم الفئة');
      return;
    }
    if (!newCatWords) {
      setCatError('الرجاء إدخال الكلمات');
      return;
    }
    const words = newCatWords.split('\n').map(w => w.trim()).filter(w => w);
    if (words.length < 3) {
      setCatError('يجب إدخال 3 كلمات على الأقل (كل كلمة في سطر)');
      return;
    }

    let updatedCategories;
    if (editingCatId) {
      updatedCategories = allCategories.map(cat => 
        cat.id === editingCatId 
          ? { ...cat, name: newCatName, words, icon: getAutoIcon(newCatName) }
          : cat
      );
    } else {
      const newCategory: Category = {
        id: Date.now().toString(),
        name: newCatName,
        words,
        icon: getAutoIcon(newCatName),
        isCustom: true
      };
      updatedCategories = [...allCategories, newCategory];
    }

    setAllCategories(updatedCategories);
    socketRef.current?.emit('update_categories', updatedCategories);
    localStorage.setItem('spyGameCategories', JSON.stringify(updatedCategories));
    
    setNewCatName('');
    setNewCatWords('');
    setEditingCatId(null);
  };

  const editCategory = (cat: Category) => {
    setNewCatName(cat.name);
    setNewCatWords(cat.words.join('\n'));
    setEditingCatId(cat.id);
    setCatError('');
  };

  const deleteCategory = (id: string) => {
    if (allCategories.length <= 1) {
      alert('يجب أن تترك فئة واحدة على الأقل');
      return;
    }
    const updatedCategories = allCategories.filter(c => c.id !== id);
    setAllCategories(updatedCategories);
    socketRef.current?.emit('update_categories', updatedCategories);
    localStorage.setItem('spyGameCategories', JSON.stringify(updatedCategories));
  };

  const [isAdminMode, setIsAdminMode] = useState(() => localStorage.getItem('isAdminMode') === 'true');
  const [isEditMode, setIsEditMode] = useState(() => localStorage.getItem('isEditMode') !== 'false');
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const [clickSequence, setClickSequence] = useState<string[]>([]);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');

  const handleCornerClick = (corner: string) => {
    const newSequence = [...clickSequence, corner];
    if (newSequence.length > 4) {
      newSequence.shift();
    }
    setClickSequence(newSequence);
    
    if (newSequence.join(',') === 'top-left,top-right,bottom-right,bottom-left') {
      setShowPasswordPrompt(true);
      setClickSequence([]);
    }
  };

  const toggleEditMode = () => {
    const nextEditMode = !isEditMode;
    setIsEditMode(nextEditMode);
    localStorage.setItem('isEditMode', String(nextEditMode));
  };

  const resetLayout = () => {
    setLayoutConfig({});
    updateSettings({ layoutConfig: {} });
    playClick();
  };

  const [layoutConfig, setLayoutConfig] = useState<Record<string, {width?: number, height?: number, x?: number, y?: number, scale?: number}>>(() => {
    try {
      const saved = localStorage.getItem('spyGameSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.layoutConfig || {};
      }
      return {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'spyGameSettings' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.layoutConfig) setLayoutConfig(parsed.layoutConfig);
        } catch (error) {
          console.error("Error parsing storage event", error);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const updateLayout = (id: string, config: { width?: number, height?: number, x?: number, y?: number, scale?: number }) => {
    const next = { ...layoutConfig, [id]: { ...layoutConfig[id], ...config } };
    setLayoutConfig(next);
    socketRef.current?.emit('update_layout', next);
    updateSettings({ layoutConfig: next });
  };

  const changeBackgroundColor = (color: string) => {
    setBackgroundColor(color);
    socketRef.current?.emit('update_background', color);
    updateSettings({ backgroundColor: color });
  };

  const clickAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const successAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const dramaticAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const revealAudioRef = React.useRef<HTMLAudioElement | null>(null);

  // Preload audio
  useEffect(() => {
    clickAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    successAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3');
    dramaticAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3');
    revealAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
    
    [clickAudioRef.current, successAudioRef.current, dramaticAudioRef.current, revealAudioRef.current].forEach(a => a.load());
  }, []);

  const playClick = () => {
    if (clickAudioRef.current) {
      clickAudioRef.current.currentTime = 0;
      clickAudioRef.current.volume = 0.8;
      clickAudioRef.current.play().catch((e) => console.error('Audio play error (click):', e));
    }
  };

  const playSuccess = () => {
    if (successAudioRef.current) {
      successAudioRef.current.currentTime = 0;
      successAudioRef.current.volume = 0.8;
      successAudioRef.current.play().catch((e) => console.error('Audio play error (success):', e));
    }
  };

  const playDramatic = () => {
    if (dramaticAudioRef.current) {
      dramaticAudioRef.current.currentTime = 0;
      dramaticAudioRef.current.volume = 0.8;
      dramaticAudioRef.current.play().catch((e) => console.error('Audio play error (dramatic):', e));
    }
  };

  const playReveal = () => {
    if (revealAudioRef.current) {
      revealAudioRef.current.currentTime = 0;
      revealAudioRef.current.volume = 0.8;
      revealAudioRef.current.play().catch((e) => console.error('Audio play error (reveal):', e));
    }
  };

  // Remove the old load data on mount useEffect as we now initialize directly
  // Keep the save effects

  // Save players whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('barra_players', JSON.stringify(players));
    } catch (e) {
      console.error('Error saving barra_players', e);
    }
  }, [players]);

  // Remove localStorage sync useEffect
  // Remove debug logs for production

  const resetScores = () => {
    playClick();
    const updatedPlayers = players.map(p => ({ ...p, score: 0 }));
    setPlayers(updatedPlayers);
    updateSession({ players: updatedPlayers });
  };

  const startGame = () => {
    playClick();
    setGameState('CATEGORY');
    updateSession({ gameState: 'CATEGORY' });
  };

  const addPlayer = () => {
    if (newPlayerName.trim() && players.length < 8) {
      playClick();
      const newPlayers = [...players, { id: Date.now().toString(), name: newPlayerName.trim(), isOut: false, votesReceived: 0, score: 0 }];
      setPlayers(newPlayers);
      setNewPlayerName('');
      updateSession({ players: newPlayers });
    }
  };

  const removePlayer = (id: string) => {
    playClick();
    const newPlayers = players.filter(p => p.id !== id);
    setPlayers(newPlayers);
    updateSession({ players: newPlayers });
  };

  const generateQuestionTurns = (gamePlayers: Player[]) => {
    const turns: QuestionTurn[] = [];
    const shuffled = [...gamePlayers].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        turns.push({ asker: shuffled[i], target: shuffled[i + 1] });
      } else {
        // If odd number of players, the last one asks the first one
        turns.push({ asker: shuffled[i], target: shuffled[0] });
      }
    }
    
    return turns;
  };

  const selectCategory = (category: Category) => {
    playClick();
    setSelectedCategory(category);
    setGameState('PLAYERS');
    updateSession({ selectedCategory: category, gameState: 'PLAYERS' });
  };

  const confirmPlayers = () => {
    if (players.length < 3 || !selectedCategory) return;
    playSuccess();
    
    const randomWord = selectedCategory.words[Math.floor(Math.random() * selectedCategory.words.length)];
    
    const outIndex = Math.floor(Math.random() * players.length);
    const newPlayers = players.map((p, idx) => ({
      ...p,
      isOut: idx === outIndex,
      votesReceived: 0,
      votedForId: undefined
    }));
    
    const turns = generateQuestionTurns(newPlayers);
    
    // Pre-generate out guess options
    const otherWords = selectedCategory.words.filter(w => w !== randomWord);
    const shuffledOthers = [...otherWords].sort(() => Math.random() - 0.5).slice(0, 5);
    const options = [...shuffledOthers, randomWord].sort(() => Math.random() - 0.5);

    setPlayers(newPlayers);
    setQuestionTurns(turns);
    setCurrentWord(randomWord);
    setOutGuessOptions(options);
    setGameState('REVEAL_HANDOVER');
    setCurrentPlayerIndex(0);
    setIsRevealed(false);

    updateSession({
      players: newPlayers,
      questionTurns: turns,
      currentWord: randomWord,
      outGuessOptions: options,
      gameState: 'REVEAL_HANDOVER',
      currentPlayerIndex: 0,
      isRevealed: false
    });
  };

  const startReveal = () => {
    playClick();
    if (players[currentPlayerIndex]?.isOut) {
      setGameState('DRAMATIC_REVEAL_OUT');
      updateSession({ gameState: 'DRAMATIC_REVEAL_OUT' });
    } else {
      setGameState('REVEAL');
      setIsRevealed(true);
      updateSession({ gameState: 'REVEAL', isRevealed: true });
    }
  };

  const nextPlayerHandover = () => {
    playClick();
    if (currentPlayerIndex < players.length - 1) {
      const nextIndex = currentPlayerIndex + 1;
      setCurrentPlayerIndex(nextIndex);
      setIsRevealed(false);
      setGameState('REVEAL_HANDOVER');
      updateSession({ currentPlayerIndex: nextIndex, isRevealed: false, gameState: 'REVEAL_HANDOVER' });
    } else {
      setGameState('QUESTIONS');
      setCurrentQuestionIndex(0);
      updateSession({ gameState: 'QUESTIONS', currentQuestionIndex: 0 });
    }
  };

  const nextQuestion = () => {
    playClick();
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= questionTurns.length) {
      const newTurns = generateQuestionTurns(players);
      setQuestionTurns(newTurns);
      setCurrentQuestionIndex(0);
      updateSession({ questionTurns: newTurns, currentQuestionIndex: 0 });
    } else {
      setCurrentQuestionIndex(nextIndex);
      updateSession({ currentQuestionIndex: nextIndex });
    }
  };

  const startVoting = () => {
    playClick();
    setCurrentVoterIndex(0);
    setGameState('VOTING_TURN');
    updateSession({ currentVoterIndex: 0, gameState: 'VOTING_TURN' });
  };

  const handleVote = (votedId: string) => {
    playClick();
    const updatedPlayers = players.map((p, idx) => {
      if (idx === currentVoterIndex) {
        return { ...p, votedForId: votedId };
      }
      if (p.id === votedId) {
        return { ...p, votesReceived: (p.votesReceived || 0) + 1 };
      }
      return p;
    });
    setPlayers(updatedPlayers);

    if (currentVoterIndex < players.length - 1) {
      const nextVoter = currentVoterIndex + 1;
      setCurrentVoterIndex(nextVoter);
      updateSession({ players: updatedPlayers, currentVoterIndex: nextVoter });
    } else {
      setGameState('DRAMATIC_REVEAL');
      updateSession({ players: updatedPlayers, gameState: 'DRAMATIC_REVEAL' });
    }
  };

  const scoringAppliedRef = React.useRef(false);

  useEffect(() => {
    if (gameState === 'DRAMATIC_REVEAL' && players.length > 0) {
      if (scoringAppliedRef.current) return;
      
      // Play dramatic sound
      playDramatic();
      
      let count = 0;
      const totalCycles = 20; // Faster: ~1.5 seconds
      
      const interval = setInterval(() => {
        const nextIdx = (revealPlayerIndex + 1) % players.length;
        setRevealPlayerIndex(nextIdx);
        updateSession({ revealPlayerIndex: nextIdx });
        count++;
        
        if (count >= totalCycles) {
          clearInterval(interval);
          scoringAppliedRef.current = true;
          
          // Determine result
          const maxVotes = Math.max(...players.map(p => p.votesReceived));
          const mostVoted = players.filter(p => p.votesReceived === maxVotes);
          const outCaught = mostVoted.some(p => p.isOut);
          
          // Play exciting reveal sound
          playReveal();

          // Scoring logic
          const outPlayer = players.find(p => p.isOut);
          let finalPlayers = players.map(p => {
            let newScore = p.score;
            if (!p.isOut) {
              if (p.votedForId === outPlayer?.id) {
                newScore += 100;
              } else {
                newScore = Math.max(0, newScore - 100);
              }
            }
            return { ...p, score: newScore };
          });

          if (!outCaught && outPlayer) {
            finalPlayers = finalPlayers.map(p => 
              p.isOut ? { ...p, score: p.score + 200 } : p
            );
          }

          const votedOutPlayer = mostVoted.find(p => p.isOut) || mostVoted[0];
          const votedOutIndex = players.findIndex(p => p.id === votedOutPlayer.id);
          
          setPlayers(finalPlayers);
          setRevealPlayerIndex(votedOutIndex);

          setTimeout(() => {
            if (outCaught) {
              setGameState('OUT_GUESS');
              updateSession({ players: finalPlayers, revealPlayerIndex: votedOutIndex, gameState: 'OUT_GUESS' });
            } else {
              setWinner('OUT');
              setGameState('RESULT');
              updateSession({ players: finalPlayers, revealPlayerIndex: votedOutIndex, winner: 'OUT', gameState: 'RESULT' });
            }
          }, 2500);
        }
      }, 100);
      
      return () => clearInterval(interval);
    } else if (gameState !== 'DRAMATIC_REVEAL') {
      scoringAppliedRef.current = false;
    } else if (gameState === 'DRAMATIC_REVEAL' && players.length === 0) {
      setGameState('START');
    }
  }, [gameState, players]);

  const handleOutGuess = (guess: string) => {
    playClick();
    const isCorrect = guess === currentWord;
    setGuessResult({ guess, isCorrect });

    // Wait a bit to show the colors
    setTimeout(() => {
      let finalWinner: 'PLAYERS' | 'OUT' = 'PLAYERS';
      let updatedPlayers = [...players];

      if (isCorrect) {
        finalWinner = 'OUT';
        updatedPlayers = players.map(p => p.isOut ? { ...p, score: p.score + 200 } : p);
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else {
        finalWinner = 'PLAYERS';
      }

      setWinner(finalWinner);
      setPlayers(updatedPlayers);
      setGameState('RESULT');
      updateSession({ winner: finalWinner, players: updatedPlayers, gameState: 'RESULT' });
      setGuessResult(null); // Reset
    }, 1000); // 1 second delay
  };

  const resetGame = () => {
    playClick();
    scoringAppliedRef.current = false;
    const updatedPlayers = players.map(p => ({ ...p, isOut: false, votesReceived: 0, votedForId: undefined }));
    setGameState('START');
    setPlayers(updatedPlayers);
    setSelectedCategory(null);
    setCurrentWord('');
    setWinner(null);
    updateSession({ gameState: 'START', players: updatedPlayers, selectedCategory: null, currentWord: '', winner: null });
  };

  const goBack = () => {
    playClick();
    let nextState = gameState;
    let nextPlayerIndex = currentPlayerIndex;
    let nextIsRevealed = isRevealed;
    let nextVoterIndex = currentVoterIndex;
    let nextPlayers = [...players];

    if (gameState === 'PLAYERS') nextState = 'START';
    else if (gameState === 'CATEGORY') nextState = 'PLAYERS';
    else if (gameState === 'REVEAL_HANDOVER') {
      if (currentPlayerIndex > 0) {
        nextPlayerIndex = currentPlayerIndex - 1;
        nextIsRevealed = true;
        nextState = 'REVEAL';
      } else {
        nextState = 'CATEGORY';
      }
    }
    else if (gameState === 'REVEAL') {
      nextIsRevealed = false;
      nextState = 'REVEAL_HANDOVER';
    }
    else if (gameState === 'QUESTIONS') {
      nextPlayerIndex = players.length - 1;
      nextIsRevealed = true;
      nextState = 'REVEAL';
    }
    else if (gameState === 'VOTING_TURN') {
      if (currentVoterIndex > 0) {
        nextVoterIndex = currentVoterIndex - 1;
        const lastVoter = players[nextVoterIndex];
        if (lastVoter.votedForId !== undefined) {
          nextPlayers = players.map(p => 
            p.id === lastVoter.votedForId ? { ...p, votesReceived: Math.max(0, p.votesReceived - 1) } : p
          );
        }
      } else {
        nextState = 'QUESTIONS';
      }
    }
    else if (gameState === 'DRAMATIC_REVEAL' || gameState === 'OUT_GUESS') {
      nextVoterIndex = players.length - 1;
      nextState = 'VOTING_TURN';
    }
    else if (gameState === 'RESULT') {
      nextState = 'START';
      nextPlayers = players.map(p => ({ ...p, isOut: false, votesReceived: 0, votedForId: undefined, score: 0 }));
      setSelectedCategory(null);
      setCurrentWord('');
    }

    setGameState(nextState);
    setCurrentPlayerIndex(nextPlayerIndex);
    setIsRevealed(nextIsRevealed);
    setCurrentVoterIndex(nextVoterIndex);
    setPlayers(nextPlayers);
    updateSession({ 
      gameState: nextState, 
      currentPlayerIndex: nextPlayerIndex, 
      isRevealed: nextIsRevealed,
      currentVoterIndex: nextVoterIndex,
      players: nextPlayers
    });
  };

  return (
    <div className="h-[100dvh] w-full font-sans text-[#1A1A1A] flex items-center justify-center overflow-hidden fixed inset-0 select-none touch-none" dir="rtl" style={{ backgroundColor }}>
      {/* Corner Click Detection */}
      <div className="fixed inset-0 z-[100] pointer-events-none">
        <div className="absolute top-0 left-0 w-20 h-20 pointer-events-auto" onClick={() => handleCornerClick('top-left')} />
        <div className="absolute top-0 right-0 w-20 h-20 pointer-events-auto" onClick={() => handleCornerClick('top-right')} />
        <div className="absolute bottom-0 right-0 w-20 h-20 pointer-events-auto" onClick={() => handleCornerClick('bottom-right')} />
        <div className="absolute bottom-0 left-0 w-20 h-20 pointer-events-auto" onClick={() => handleCornerClick('bottom-left')} />
      </div>

      {/* Password Prompt */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white p-6 rounded-3xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-sm space-y-4">
            <div className="text-lg font-black">أدخل كلمة السر</div>
            <input 
              type="password" 
              className="w-full p-3 border-2 border-black rounded-xl font-mono"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  if (password === 'fadiali1985$') {
                    setIsAdminMode(true);
                    localStorage.setItem('isAdminMode', 'true');
                    setShowPasswordPrompt(false);
                    setPassword('');
                  } else {
                    alert('كلمة السر خاطئة');
                  }
                }}
                className="flex-1 p-3 bg-black text-white rounded-xl font-bold"
              >
                حسناً
              </button>
              <button 
                onClick={() => { setShowPasswordPrompt(false); setPassword(''); }}
                className="flex-1 p-3 bg-gray-200 rounded-xl font-bold"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Gear Icon - Only visible in Admin Mode */}
      {isAdminMode && (
      <div className="fixed top-4 right-4 z-[200] flex gap-2">
        {/* Main Settings Button (The Gear) */}
        <button
          onClick={() => setShowAdminPanel(prev => !prev)}
          className="p-3 bg-white/90 backdrop-blur-md rounded-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:scale-95 transition-all"
        >
          <Settings className={`w-6 h-6 ${showAdminPanel ? 'rotate-90' : ''} transition-transform`} />
        </button>

        {/* Admin Panel Popover */}
        <AnimatePresence>
          {showAdminPanel && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-16 right-0 bg-white border-4 border-black rounded-3xl p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-64 space-y-3"
            >
              <div className="text-sm font-black mb-2 border-b-2 border-black pb-2">إعدادات اللعبة</div>
              
              <button
                onClick={() => { setIsColorPickerOpen(true); setShowAdminPanel(false); }}
                className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 rounded-xl transition-colors font-bold text-sm"
              >
                <div className="w-5 h-5 rounded-full border-2 border-black" style={{ backgroundColor }} />
                تغيير لون الخلفية
              </button>

              <button
                onClick={() => { setIsManageCategoriesOpen(true); setShowAdminPanel(false); }}
                className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 rounded-xl transition-colors font-bold text-sm"
              >
                <Package className="w-5 h-5" />
                إدارة الفئات
              </button>

              <button
                onClick={() => { toggleEditMode(); setShowAdminPanel(false); }}
                className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors font-bold text-sm ${isEditMode ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
              >
                <Eye className="w-5 h-5" />
                {isEditMode ? 'إخفاء أدوات التعديل' : 'إظهار أدوات التعديل'}
              </button>

              {isAdminMode && (
                <button
                  onClick={resetLayout}
                  className="w-full flex items-center gap-3 p-2 hover:bg-red-50 text-red-600 rounded-xl transition-colors font-bold text-sm"
                >
                  <RotateCcw className="w-5 h-5" />
                  إعادة ضبط الأحجام
                </button>
              )}
              
              <div className="h-px bg-gray-200" />
              <div className="p-2 bg-gray-50 rounded-xl border-2 border-black/5">
                <div className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-1">معلومات الجلسة</div>
                <div className="text-[10px] font-mono break-all opacity-70">
                  لعبة محلية
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      )}

      <>
        <ManageCategoriesModal 
          isOpen={isManageCategoriesOpen} 
          onClose={() => {
            setIsManageCategoriesOpen(false);
            setEditingCatId(null);
            setNewCatName('');
            setNewCatWords('');
            setCatError('');
          }} 
            categories={allCategories} 
            addCategory={addCategory} 
            deleteCategory={deleteCategory} 
            newCatName={newCatName} 
            setNewCatName={setNewCatName} 
            newCatWords={newCatWords} 
            setNewCatWords={setNewCatWords} 
            editingCatId={editingCatId}
            editCategory={editCategory}
            catError={catError}
          />
          <ColorPickerModal 
            isOpen={isColorPickerOpen} 
            onClose={() => setIsColorPickerOpen(false)} 
            color={backgroundColor} 
            onChange={changeBackgroundColor} 
          />
          {/* Phone Frame for Desktop */}
          <div className="w-full max-w-[430px] h-full md:h-[95dvh] md:max-h-[850px] relative overflow-hidden md:rounded-[60px] md:border-[12px] md:border-[#2A2A2A] md:shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center pt-16 pb-8 px-6" style={{ backgroundColor }}>
            
            {/* Notch/Dynamic Island effect for phone look */}
            <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-[#2A2A2A] rounded-b-3xl z-[120]" />

        {/* Back Button */}
        {gameState !== 'START' && (
          <ResizableBox id="btn-back" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="absolute top-4 left-4 z-[150]">
            <button
              onClick={goBack}
              className="w-full h-full p-2 bg-white/90 backdrop-blur-md rounded-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:scale-95 transition-all flex items-center justify-center"
            >
              <ChevronRight className="w-full h-full rotate-180" />
            </button>
          </ResizableBox>
        )}

        <AnimatePresence mode="wait">
          {gameState === 'START' && (
            <motion.div 
              key="start"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="text-center space-y-8 w-full relative"
            >
            <ResizableBox id="title-box" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full flex flex-col items-center">
              <ResizableBox id="title-text" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="relative w-full">
                <motion.h1 
                  className="text-5xl font-black tracking-tighter text-[#E63946] drop-shadow-lg text-center"
                  animate={{ rotate: [-1, 1, -1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  برا السالفة
                </motion.h1>
              </ResizableBox>
              <ResizableBox id="title-subtitle" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                <p className="text-lg font-medium opacity-80 mt-4 text-center">الكل يعرف السالفة إلا واحد!</p>
              </ResizableBox>
            </ResizableBox>
            
            <div className="flex flex-col gap-3 items-center justify-center mx-auto w-full">
              <ResizableBox id="btn-start-game" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-fit">
                <button 
                  onClick={startGame}
                  className="w-full h-full group relative bg-[#E63946] text-white px-10 py-4 rounded-2xl text-xl font-bold shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <Play className="fill-current w-5 h-5" />
                  ابدأ اللعب
                </button>
              </ResizableBox>
              <ResizableBox id="btn-how-to-play" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-fit">
                <button 
                  onClick={() => setShowHowTo(true)}
                  className="w-full h-full text-base font-bold underline underline-offset-4 opacity-60 hover:opacity-100 active:scale-95 transition-all"
                >
                  كيف نلعب؟
                </button>
              </ResizableBox>
            </div>
            <ResizableBox id="dev-credit" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="absolute bottom-6 left-0 right-0">
              <div className="text-center text-sm font-bold opacity-40">
                المبرمج: علي حاج مرعي
              </div>
            </ResizableBox>
          </motion.div>
        )}

        {showHowTo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setShowHowTo(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <ResizableBox id="how-to-box" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="bg-white w-full max-w-md p-6 rounded-[32px] border-4 border-black shadow-[8px_8px_0px_0px_rgba(230,57,70,1)] relative flex flex-col items-center">
                <ResizableBox id="how-to-close" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="absolute top-4 left-4">
                  <button 
                    onClick={() => setShowHowTo(false)}
                    className="p-1.5 hover:bg-gray-100 rounded-full active:scale-95 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </ResizableBox>
                <ResizableBox id="how-to-title" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                  <h2 className="text-2xl font-black mb-4 text-center">طريقة اللعب 🎮</h2>
                </ResizableBox>
                <ResizableBox id="how-to-content" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                  <div className="space-y-3 text-right">
                    <div className="flex gap-3">
                      <div className="w-6 h-6 bg-[#FFD700] rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border-2 border-black">1</div>
                      <p className="font-bold text-sm">اختاروا الفئة ومرروا الجوال بينكم، كل واحد يشوف السالفة إلا واحد بيطلع له "أنت برا السالفة".</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 bg-[#FFD700] rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border-2 border-black">2</div>
                      <p className="font-bold text-sm">ابدأوا اسألوا بعض أسئلة ذكية عن السالفة بدون ما توضحونها مرة عشان اللي برا ما يعرفها.</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 bg-[#FFD700] rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border-2 border-black">3</div>
                      <p className="font-bold text-sm">بعد ما يخلص النقاش، كل واحد يصوت على الشخص اللي يشك فيه.</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 bg-[#FFD700] rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border-2 border-black">4</div>
                      <p className="font-bold text-sm">لو كشفتوه، يقدر يفوز لو عرف وش هي السالفة! لو ما كشفتوه، هو اللي يفوز.</p>
                    </div>
                  </div>
                </ResizableBox>
                <ResizableBox id="how-to-btn" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full mt-6">
                  <button 
                    onClick={() => setShowHowTo(false)}
                    className="w-full bg-black text-white py-3 rounded-xl font-bold text-sm active:scale-95 transition-all"
                  >
                    فهمت!
                  </button>
                </ResizableBox>
              </ResizableBox>
            </motion.div>
          </motion.div>
        )}

        {gameState === 'PLAYERS' && (
          <motion.div 
            key="players"
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="w-full px-6 space-y-6"
          >
            <ResizableBox id="players-box" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="bg-white p-4 rounded-3xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col">
              <ResizableBox id="players-header" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-black flex items-center gap-2">
                    <Users className="w-6 h-6" />
                    اللاعبين
                  </h2>
                  {players.some(p => p.score !== 0) && (
                    <button 
                      onClick={resetScores}
                      className="text-xs font-bold text-red-500 underline underline-offset-4 active:scale-95 transition-all"
                    >
                      تصفير النقاط
                    </button>
                  )}
                </div>
              </ResizableBox>
              
              <ResizableBox id="players-input" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                <div className="flex gap-2 mb-4">
                  <input 
                    type="text" 
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
                    className="flex-1 bg-gray-100 border-2 border-black rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#E63946]"
                    placeholder="اسم اللاعب..."
                  />
                  <button 
                    onClick={addPlayer}
                    className="p-2 bg-black text-white rounded-xl border-2 border-black hover:bg-gray-800 active:scale-95 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </ResizableBox>

              <ResizableBox id="players-list" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                  <AnimatePresence mode="popLayout">
                    {players.length === 0 && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center py-4 opacity-40 text-sm font-bold"
                      >
                        أضف 3 لاعبين على الأقل للبدء
                      </motion.div>
                    )}
                    {players.map((player) => (
                      <motion.div 
                        key={player.id} 
                        layout
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, x: -20 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border-2 border-black"
                      >
                        <span className="flex-1 font-bold text-sm">{player.name}</span>
                        <button 
                          onClick={() => removePlayer(player.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg active:scale-95 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </ResizableBox>
            </ResizableBox>

            <ResizableBox id="btn-confirm-players" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
              <button 
                onClick={confirmPlayers}
                disabled={players.length < 3}
                className={`w-full h-full py-4 rounded-xl text-lg font-bold transition-all flex items-center justify-center gap-2 ${
                  players.length >= 3 
                  ? 'bg-[#E63946] text-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:scale-95' 
                  : 'bg-gray-200 text-gray-400 border-2 border-dashed border-gray-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                تأكيد وبدء اللعب
              </button>
            </ResizableBox>
          </motion.div>
        )}

        {gameState === 'CATEGORY' && (
          <motion.div 
            key="category"
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -300, opacity: 0 }}
            className="w-full px-6 space-y-6"
          >
            <ResizableBox id="category-title" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
              <h2 className="text-3xl font-black text-center mb-5">اختر الفئة</h2>
            </ResizableBox>
            <ResizableBox id="category-box" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar p-1">
              {allCategories.map((cat, idx) => (
                <ResizableBox key={cat.id} id={`category-btn-${cat.id}`} isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full h-full">
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => selectCategory(cat)}
                    className="w-full h-full bg-white p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:scale-95 transition-all flex flex-col items-center gap-2 group"
                  >
                    <div className="p-3 bg-[#F1FAEE] rounded-xl group-hover:scale-110 transition-transform">
                      {ICON_MAP[cat.icon]}
                    </div>
                    <span className="text-base font-black">{cat.name}</span>
                  </motion.button>
                </ResizableBox>
              ))}
            </ResizableBox>
          </motion.div>
        )}

        {gameState === 'REVEAL_HANDOVER' && players.length > 0 && (
          <motion.div 
            key={`handover-${currentPlayerIndex}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full px-6 text-center space-y-8"
          >
            <ResizableBox id="handover-box" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="bg-white p-8 rounded-[36px] border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center">
              <ResizableBox id="handover-icon" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-20 h-20 bg-[#FFD700] rounded-full flex items-center justify-center mb-5 border-4 border-black">
                <Users className="w-10 h-10" />
              </ResizableBox>
              <ResizableBox id="handover-title" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                <h2 className="text-3xl font-black mb-3 text-center">مرر الجوال</h2>
              </ResizableBox>
              <ResizableBox id="handover-subtitle" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                <p className="text-xl font-bold mb-6 text-center">أعطِ الجوال للاعب:</p>
              </ResizableBox>
              <ResizableBox id="handover-player-name" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                <div className="text-4xl font-black text-[#E63946] bg-gray-50 py-5 rounded-2xl border-2 border-black text-center">
                  {players[currentPlayerIndex]?.name || '...'}
                </div>
              </ResizableBox>
            </ResizableBox>
            <ResizableBox id="btn-handover" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
              <button 
                onClick={startReveal}
                className="w-full h-full bg-black text-white py-5 rounded-2xl text-xl font-bold shadow-[8px_8px_0px_0px_rgba(230,57,70,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:scale-95 transition-all"
              >
                استلمت الجوال
              </button>
            </ResizableBox>
          </motion.div>
        )}

        {gameState === 'REVEAL' && players.length > 0 && (
          <motion.div 
            key={`reveal-${currentPlayerIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full px-6 text-center space-y-8"
          >
            <ResizableBox id="reveal-box" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="bg-white p-8 rounded-[36px] border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden flex flex-col items-center">
              <div className="absolute top-0 left-0 w-full h-2 bg-[#E63946]" />
              <ResizableBox id="reveal-player-name" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                <h3 className="text-2xl font-bold mb-3 text-center">يا {players[currentPlayerIndex]?.name || 'لاعب'}:</h3>
              </ResizableBox>
              
              <div className="min-h-[180px] flex flex-col items-center justify-center w-full">
                <motion.div 
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="space-y-4 w-full flex flex-col items-center"
                >
                  <ResizableBox id="reveal-subtitle" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                    <div className="text-lg font-medium opacity-60 text-center">السالفة هي:</div>
                  </ResizableBox>
                  <ResizableBox id="reveal-word" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                    <div className="text-4xl md:text-5xl font-black text-black bg-white px-10 py-6 rounded-2xl border-4 border-black text-center leading-relaxed">
                      {players[currentPlayerIndex]?.isOut ? 'أنت برا السالفة!' : currentWord}
                    </div>
                  </ResizableBox>
                  <ResizableBox id="reveal-warning" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                    <p className="text-sm font-bold text-red-500 mt-3 text-center">تأكد إن ما أحد يشوف معك!</p>
                  </ResizableBox>
                </motion.div>
              </div>
            </ResizableBox>

            <ResizableBox id="btn-reveal-next" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
              <button 
                onClick={nextPlayerHandover}
                className="w-full h-full bg-black text-white py-5 rounded-2xl text-xl font-bold shadow-[8px_8px_0px_0px_rgba(230,57,70,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:scale-95 transition-all"
              >
                {currentPlayerIndex < players.length - 1 ? 'التالي' : 'ابدأ الأسئلة'}
              </button>
            </ResizableBox>
          </motion.div>
        )}

        {gameState === 'DRAMATIC_REVEAL_OUT' && (
          <DramaticRevealOut
            players={players}
            outIndex={players.findIndex(p => p.isOut)}
            onComplete={() => {
              setGameState('REVEAL');
              setIsRevealed(true);
              updateSession({ gameState: 'REVEAL', isRevealed: true });
            }}
          />
        )}

        {gameState === 'QUESTIONS' && questionTurns.length > 0 && (
          <motion.div 
            key="questions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full px-6 text-center space-y-6"
          >
            <ResizableBox id="questions-box" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="bg-white p-8 rounded-[36px] border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center">
              <ResizableBox id="questions-title" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                <div className="flex items-center justify-center gap-2 mb-6">
                  <MessageCircle className="w-8 h-8 text-[#E63946]" />
                  <h2 className="text-2xl font-black">وقت الأسئلة</h2>
                </div>
              </ResizableBox>
              
              <div className="space-y-5 w-full flex flex-col items-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuestionIndex}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="w-full space-y-5 flex flex-col items-center"
                  >
                    <ResizableBox id="questions-asker" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                      <div className="p-5 bg-gray-50 rounded-2xl border-2 border-black text-center">
                        <div className="text-xs font-bold opacity-50 mb-1">اللاعب اللي يسأل:</div>
                        <div className="text-3xl font-black text-[#E63946]">{questionTurns[currentQuestionIndex]?.asker?.name || '...'}</div>
                      </div>
                    </ResizableBox>
                    
                    <ResizableBox id="questions-vs" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                      <div className="text-2xl font-black text-center">يسأل</div>
                    </ResizableBox>

                    <ResizableBox id="questions-target" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                      <div className="p-5 bg-gray-50 rounded-2xl border-2 border-black text-center">
                        <div className="text-xs font-bold opacity-50 mb-1">اللاعب اللي يجاوب:</div>
                        <div className="text-3xl font-black text-black">{questionTurns[currentQuestionIndex]?.target?.name || '...'}</div>
                      </div>
                    </ResizableBox>
                  </motion.div>
                </AnimatePresence>
              </div>
            </ResizableBox>

            <div className="flex flex-col gap-3">
              <ResizableBox id="btn-next-question" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                <button 
                  onClick={nextQuestion}
                  className="w-full h-full bg-black text-white py-4 rounded-xl text-lg font-bold shadow-[6px_6px_0px_0px_rgba(230,57,70,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:scale-95 transition-all"
                >
                  السؤال التالي
                </button>
              </ResizableBox>

              <ResizableBox id="btn-vote-now" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                <button 
                  onClick={startVoting}
                  className="w-full h-full bg-[#E63946] text-white py-4 rounded-xl text-lg font-bold shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:scale-95 transition-all"
                >
                  صوّت الآن
                </button>
              </ResizableBox>
            </div>

            <ResizableBox id="questions-turn-text" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
              <div className="text-center font-bold opacity-40 text-sm">
                الدور {currentQuestionIndex + 1} من {questionTurns.length}
              </div>
            </ResizableBox>
          </motion.div>
        )}

        {gameState === 'VOTING_TURN' && players.length > 0 && (
          <motion.div 
            key={`voting_turn-${currentVoterIndex}`}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-8 w-full px-6 space-y-4"
          >
            <ResizableBox id="voting-box" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="bg-white p-6 rounded-[32px] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center flex flex-col items-center">
              <ResizableBox id="voting-title" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                <h3 className="text-xs font-bold opacity-60 mb-1 text-center">دور اللاعب:</h3>
              </ResizableBox>
              <ResizableBox id="voting-player-name" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                <h2 className="text-3xl font-black text-[#E63946] mb-4 text-center">{players[currentVoterIndex]?.name || '...'}</h2>
              </ResizableBox>
              <ResizableBox id="voting-subtitle" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                <p className="text-sm font-bold mb-4 text-center">يا {players[currentVoterIndex]?.name}، من تصوت عليه؟</p>
              </ResizableBox>
              
              <ResizableBox id="voting-options" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                <div className="grid grid-cols-2 gap-3 max-h-[35vh] overflow-y-auto pr-1 custom-scrollbar">
                  {players.filter((_, idx) => idx !== currentVoterIndex).map((player, idx) => (
                    <ResizableBox key={player.id} id={`voting-btn-${player.id}`} isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full h-full">
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => handleVote(player.id)}
                        className="w-full h-full bg-gray-50 p-3.5 rounded-xl border-2 border-black hover:bg-[#FFD700] active:scale-95 transition-all flex items-center justify-between group"
                      >
                        <span className="text-sm font-black truncate">{player.name}</span>
                        <CheckCircle2 className="w-5 h-5 opacity-20 group-hover:opacity-100" />
                      </motion.button>
                    </ResizableBox>
                  ))}
                </div>
              </ResizableBox>
            </ResizableBox>
            
            <ResizableBox id="voting-turn-text" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
              <div className="text-center text-xs font-bold opacity-40">
                لاعب {currentVoterIndex + 1} من {players.length}
              </div>
            </ResizableBox>
          </motion.div>
        )}

        {gameState === 'DRAMATIC_REVEAL' && players.length > 0 && (
          <motion.div 
            key="dramatic_reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-black"
          >
            <div className="absolute inset-0 bg-reveal-pattern animate-slide-bg opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#E63946]/40 via-transparent to-black" />
            
            <ResizableBox id="dramatic-reveal-content" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="relative z-10 text-center space-y-8 px-6 w-full flex flex-col items-center">
              <ResizableBox id="dramatic-reveal-header" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                <motion.div
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="space-y-1"
                >
                  <div className="text-lg font-bold text-[#FFD700] tracking-[0.2em] uppercase text-center">جاري البحث عن</div>
                  <div className="text-3xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] text-center">
                    اللي برا السالفة...
                  </div>
                </motion.div>
              </ResizableBox>
              
              <ResizableBox id="dramatic-reveal-player" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                <div className="relative h-32 flex items-center justify-center">
                  <AnimatePresence mode="popLayout">
                    <motion.div 
                      key={revealPlayerIndex}
                      initial={{ y: 40, opacity: 0, scale: 0.5, rotate: -5 }}
                      animate={{ y: 0, opacity: 1, scale: 1.1, rotate: 0 }}
                      exit={{ y: -40, opacity: 0, scale: 0.5, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="text-5xl md:text-6xl font-black text-[#FFD700] drop-shadow-[0_0_30px_rgba(255,215,0,0.6)] text-center"
                    >
                      {players[revealPlayerIndex]?.name || '...'}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </ResizableBox>
              
              <ResizableBox id="dramatic-reveal-dots" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                <div className="flex gap-3 justify-center">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ 
                        scale: [1, 1.3, 1], 
                        opacity: [0.2, 1, 0.2],
                        backgroundColor: ["#E63946", "#FFD700", "#E63946"]
                      }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                      className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(230,57,70,0.5)]"
                    />
                  ))}
                </div>
              </ResizableBox>
            </ResizableBox>

            {/* Scanning line effect */}
            <motion.div 
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#E63946] to-transparent opacity-50 blur-sm"
            />
          </motion.div>
        )}

        {gameState === 'OUT_GUESS' && (
          <motion.div 
            key="out_guess"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="w-full px-6 text-center space-y-4"
          >
            <ResizableBox id="out-guess-box" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="bg-white p-6 rounded-[32px] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center">
              <ResizableBox id="out-guess-icon" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full flex justify-center">
                <AlertCircle className="w-10 h-10 mb-3 text-orange-500" />
              </ResizableBox>
              <ResizableBox id="out-guess-title" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                <h2 className="text-2xl font-black mb-2 text-center">كشفتوه!</h2>
              </ResizableBox>
              <ResizableBox id="out-guess-subtitle" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                <p className="text-sm font-bold mb-5 text-center leading-relaxed">يا {players.find(p => p.isOut)?.name}، أنت برا السالفة فعلاً. الحين عندك فرصة تفوز لو عرفت وش هي السالفة!</p>
              </ResizableBox>
              
              <ResizableBox id="out-guess-options" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                <div className="grid grid-cols-2 gap-3 max-h-[35vh] overflow-y-auto pr-1 custom-scrollbar">
                  {outGuessOptions.map((word, idx) => (
                    <ResizableBox key={idx} id={`out-guess-btn-${idx}`} isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full h-full">
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => handleOutGuess(word)}
                        className={`w-full h-full p-3 border-2 border-black rounded-xl text-sm font-bold transition-all truncate ${
                          guessResult 
                            ? word === currentWord 
                              ? 'bg-green-500 text-white' 
                              : word === guessResult.guess 
                                ? 'bg-red-500 text-white' 
                                : 'bg-gray-50'
                            : 'bg-gray-50 hover:bg-[#FFD700] active:scale-95'
                        }`}
                      >
                        {word}
                      </motion.button>
                    </ResizableBox>
                  ))}
                </div>
              </ResizableBox>
            </ResizableBox>
          </motion.div>
        )}

        {gameState === 'RESULT' && (
          <motion.div 
            key="result"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="w-full px-6 text-center space-y-6"
          >
            <ResizableBox id="result-box" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="bg-white p-6 rounded-[32px] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center">
              <ResizableBox id="result-summary" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                <div className="p-4 bg-gray-100 rounded-2xl border-2 border-black text-center">
                  <div className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-1">السالفة كانت</div>
                  <div className="text-2xl font-black">{currentWord}</div>
                  <div className="mt-2 pt-2 border-t-2 border-black/10">
                    <div className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-1">اللي كان برا</div>
                    <div className="text-xl font-black text-[#E63946]">{players.find(p => p.isOut)?.name}</div>
                  </div>
                </div>
              </ResizableBox>

              <ResizableBox id="result-scores" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full mt-5">
                <div className="space-y-2">
                  <h3 className="text-sm font-black mb-2 text-center">ترتيب النقاط 🏆</h3>
                  <div className="overflow-y-auto pr-1 custom-scrollbar space-y-2">
                    {[...players].sort((a, b) => b.score - a.score).map((player, idx) => (
                      <ResizableBox key={player.id} id={`result-score-${player.id}`} isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                        <motion.div 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border-2 border-black"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 flex items-center justify-center bg-black text-white rounded-full text-[10px] font-bold">{idx + 1}</span>
                            <span className="font-bold text-xs">{player.name}</span>
                          </div>
                          <div className={`font-black text-xs ${player.score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {player.score > 0 ? '+' : ''}{player.score}
                          </div>
                        </motion.div>
                      </ResizableBox>
                    ))}
                  </div>
                </div>
              </ResizableBox>
            </ResizableBox>

            <ResizableBox id="btn-play-again" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
              <button 
                onClick={resetGame}
                className="w-full h-full bg-black text-white py-4 rounded-xl text-lg font-bold shadow-[6px_6px_0px_0px_rgba(230,57,70,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                لعب مرة ثانية
              </button>
            </ResizableBox>
          </motion.div>
        )}
      </AnimatePresence>

        {!['START', 'PLAYERS', 'CATEGORY', 'REVEAL_HANDOVER', 'REVEAL', 'QUESTIONS', 'VOTING_TURN', 'DRAMATIC_REVEAL', 'DRAMATIC_REVEAL_OUT', 'RESULT', 'OUT_GUESS'].includes(gameState) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="z-50 w-full px-6"
          >
            <ResizableBox id="error-box" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="bg-white p-10 rounded-[40px] border-4 border-black text-center shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] w-full flex flex-col items-center">
              <ResizableBox id="error-icon" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full flex justify-center">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
              </ResizableBox>
              <ResizableBox id="error-title" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full">
                <h2 className="text-2xl font-black mb-4 text-center">عذراً، حدث خطأ في النظام</h2>
              </ResizableBox>
              <ResizableBox id="btn-error-reset" isAdminMode={isAdminMode} isEditMode={isEditMode} layoutConfig={layoutConfig} updateLayout={updateLayout} className="w-full mt-4">
                <button 
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="w-full h-full bg-black text-white px-8 py-4 rounded-2xl font-bold shadow-[6px_6px_0px_0px_rgba(230,57,70,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  إعادة تهيئة اللعبة
                </button>
              </ResizableBox>
            </ResizableBox>
          </motion.div>
        )}
      </div>
    </>
  <style>{`
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      position: fixed;
      width: 100%;
      height: 100%;
      overscroll-behavior: none;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(0,0,0,0.2);
      border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(0,0,0,0.4);
    }
    .bg-reveal-pattern {
      background-image: radial-gradient(#E63946 2px, transparent 2px);
      background-size: 30px 30px;
    }
    @keyframes slide-bg {
      0% { background-position: 0 0; }
      100% { background-position: 60px 60px; }
    }
    .animate-slide-bg {
      animation: slide-bg 2s linear infinite;
    }
  `}</style>
</div>
);
}

