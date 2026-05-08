import { motion, AnimatePresence } from "motion/react";
import { 
  Grid, 
  Settings, 
  Bookmark, 
  UserSquare, 
  MapPin, 
  Link as LinkIcon,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
  Smile,
  X,
  ChevronLeft,
  ChevronUp,
  BadgeCheck
} from "lucide-react";
import { 
  onSnapshot, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc as firestoreAddDoc,
  query,
  orderBy,
  where,
  getDocs
} from "firebase/firestore";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { db, auth, signInWithGoogle, handleFirestoreError, OperationType } from "./lib/firebase";
import React, { useState, useEffect, useRef } from "react";

// Types
interface ChatMessage {
  id: number;
  sender: 'me' | 'them';
  text: string;
  time: string;
}

interface ChatUser {
  id: number;
  name: string;
  avatar: string;
  status: string;
  subtitle: string;
  isOnline: boolean;
  messages: ChatMessage[];
}

interface Post {
  id: number;
  img: string;
  likes: number;
  caption: string;
  time: string;
  commentsCount: number;
  comments: Comment[];
}

interface Highlight {
  id: number;
  title: string;
  img: string;
}

interface ProfileData {
  username: string;
  name: string;
  bio: string;
  followedByUsers: string[];
  followedByCount: number;
  postCount: number;
  followersCount: string;
  followingCount: string;
  fontFamily: 'nanum' | 'sans' | 'serif' | 'instagram';
  website: string;
  avatar: string;
}

const DEFAULT_CHATS: ChatUser[] = [
  { 
    id: 1, 
    name: "Design Inovator", 
    avatar: "https://picsum.photos/seed/korea/100/100", 
    status: "Active 2h ago", 
    subtitle: "Instagram User",
    isOnline: true,
    messages: [
      { id: 1, sender: 'me', text: "Hi! How can we help you today?", time: "2:15 PM" },
      { id: 2, sender: 'them', text: "Loved your recent results!", time: "2:20 PM" }
    ]
  },
  { 
    id: 2, 
    name: "Tech Guru", 
    avatar: "https://picsum.photos/seed/tech/100/100", 
    status: "Active now", 
    subtitle: "Instagram User",
    isOnline: true,
    messages: [
      { id: 1, sender: 'them', text: "Can we collaborate?", time: "4:30 PM" }
    ]
  },
  { 
    id: 3, 
    name: "Pixel Perfect", 
    avatar: "https://picsum.photos/seed/pixel/100/100", 
    status: "Active 1h ago", 
    subtitle: "Instagram User",
    isOnline: false,
    messages: [
      { id: 1, sender: 'them', text: "Sent a photo", time: "5:00 PM" }
    ]
  },
];

const DEFAULT_PROFILE: ProfileData = {
  username: "studiolumina_official",
  name: "STUDIO LUMINA",
  bio: "Creative Design Studio & Intelligence\nBlending artistic vision with technical precision.\nSeoul • London • Silicon Valley",
  followedByUsers: ["starpeace_official", "Jun.s_00", "cha.doyn"],
  followedByCount: 42,
  postCount: 7,
  followersCount: "7.1k",
  followingCount: "450",
  fontFamily: 'nanum',
  website: "studiolumina.com",
  avatar: "https://picsum.photos/seed/lumina-logo/400/400"
};

const DEFAULT_POSTS: Post[] = [
  { 
    id: 1, 
    img: "https://picsum.photos/seed/p1/600/600", 
    likes: 1241, 
    caption: "디지털 경험에 대한 새로운 탐구. 단순함이 최고의 세련됨임을 믿습니다.",
    time: "4시간 전",
    commentsCount: 84,
    comments: [
      { id: 1, user: "minji_design", avatar: "https://picsum.photos/seed/korea/100/100", text: "와 진짜 색감 미쳤네요... 너무 예뻐요! 😍", time: "2시간 전", likes: 12, isLiked: false },
      { id: 2, user: "tech_art_lab", avatar: "https://picsum.photos/seed/tech/100/100", text: "디테일이 정말 대단합니다. 영감 받고 가요!", time: "1시간 전", likes: 5, isLiked: false }
    ]
  },
  { 
    id: 2, 
    img: "https://picsum.photos/seed/p2/600/600", 
    likes: 892, 
    caption: "브랜딩의 핵심은 일관성입니다. 이번 프로젝트의 비하인드를 확인해보세요.",
    time: "어제",
    commentsCount: 42,
    comments: [
      { id: 1, user: "brand_master.official", avatar: "https://picsum.photos/seed/pixel/100/100", text: "레이아웃이 정말 깔끔하네요. 루미나만의 감성이 느껴집니다.", time: "12시간 전", likes: 8, isLiked: false }
    ]
  },
  { 
    id: 3, 
    img: "https://picsum.photos/seed/p3/600/600", 
    likes: 2410, 
    caption: "서울에서 만나는 새로운 공간 디자인.",
    time: "4일 전",
    commentsCount: 156,
    comments: [
      { id: 1, user: "studio_h", avatar: "https://picsum.photos/seed/daily/100/100", text: "항상 믿고 보는 루미나 작업물! 오늘도 최고네요 👍", time: "2일 전", likes: 24, isLiked: false },
      { id: 2, user: "daily_creative", avatar: "https://picsum.photos/seed/creative/100/100", text: "혹시 사용된 폰트 정보 알 수 있을까요? 너무 매력적이에요.", time: "1일 전", likes: 3, isLiked: false }
    ]
  },
  { 
    id: 4, 
    img: "https://picsum.photos/seed/p4/600/600", 
    likes: 1532, 
    caption: "자연에서 얻은 영감. Light & Shadow.",
    time: "1주 전",
    commentsCount: 92, 
    comments: [
      { id: 1, user: "k_designer", avatar: "https://picsum.photos/seed/kd/100/100", text: "심플함의 정석이네요. 잘 보고 갑니다 :)", time: "5일 전", likes: 15, isLiked: false }
    ] 
  },
  { id: 5, img: "https://picsum.photos/seed/p5/600/600", likes: 743, caption: "Work in progress.", time: "2주 전", commentsCount: 31, comments: [] },
  { id: 6, img: "https://picsum.photos/seed/p6/600/600", likes: 3102, caption: "Lumina Intelligence.", time: "2주 전", commentsCount: 210, comments: [] },
  { id: 7, img: "https://picsum.photos/seed/p7/600/600", likes: 1847, caption: "Seoul • London • Silicon Valley", time: "3주 전", commentsCount: 67, comments: [] },
];

const DEFAULT_HIGHLIGHTS: Highlight[] = [
  { id: 1, title: "Design", img: "https://picsum.photos/seed/design/200/200" },
  { id: 2, title: "Events", img: "https://picsum.photos/seed/events/200/200" },
  { id: 3, title: "BTS", img: "https://picsum.photos/seed/bts/200/200" },
  { id: 4, title: "Tips", img: "https://picsum.photos/seed/tips/200/200" },
  { id: 5, title: "Archive", img: "https://picsum.photos/seed/archive/200/200" },
];

const EditModal = ({ 
  data, 
  onSave, 
  onClose,
  type
}: { 
  key?: string,
  data: any, 
  onSave: (newData: any) => void, 
  onClose: () => void,
  type: "profile" | "posts" | "highlights" | "comments"
}) => {
  const [formData, setFormData] = useState(data);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const getTitle = () => {
    switch(type) {
      case "profile": return "프로필 편집";
      case "posts": return "게시물 관리";
      case "highlights": return "하이라이트 관리";
      case "comments": return "Edit Post Comments";
      default: return "Edit";
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="relative bg-zinc-900 w-full max-w-lg p-8 rounded-2xl border border-zinc-800 shadow-2xl overflow-y-auto max-h-[80vh]"
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold">{getTitle()}</h2>
          <button onClick={onClose}><X size={20} className="text-zinc-400" /></button>
        </div>

        <div className="space-y-6">
          {type === "profile" && (
            <>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Username</label>
                <input 
                  className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm focus:border-brand-accent outline-none"
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Display Name</label>
                <input 
                  className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm focus:border-brand-accent outline-none"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Bio</label>
                <textarea 
                  className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm focus:border-brand-accent outline-none h-24"
                  value={formData.bio}
                  onChange={e => setFormData({...formData, bio: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Followed By Users (Split by comma)</label>
                <input 
                  className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm focus:border-brand-accent outline-none mb-2"
                  value={formData.followedByUsers?.join(", ") || ""}
                  onChange={e => setFormData({...formData, followedByUsers: e.target.value.split(",").map(s => s.trim())})}
                  placeholder="starpeace_official, Jun.s_00, cha.doyn"
                />
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Followed By Extra Count (N)</label>
                <input 
                  type="number"
                  className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm focus:border-brand-accent outline-none"
                  value={formData.followedByCount}
                  onChange={e => setFormData({...formData, followedByCount: parseInt(e.target.value) || 0})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Posts Count</label>
                <input 
                  type="number"
                  className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm focus:border-brand-accent outline-none mb-2"
                  value={formData.postCount}
                  min={0}
                  max={7}
                  onChange={e => setFormData({...formData, postCount: Math.min(7, parseInt(e.target.value) || 0)})}
                />
                <p className="text-[10px] text-zinc-500 italic">Adjusting this will automatically create or remove posts following the new number.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Website URL (studiolumina.com)</label>
                <input 
                  className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm focus:border-brand-accent outline-none"
                  value={formData.website}
                  onChange={e => setFormData({...formData, website: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Followers</label>
                  <input 
                    className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm focus:border-brand-accent outline-none"
                    value={formData.followersCount}
                    onChange={e => setFormData({...formData, followersCount: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Following</label>
                  <input 
                    className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm focus:border-brand-accent outline-none"
                    value={formData.followingCount}
                    onChange={e => setFormData({...formData, followingCount: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">App Font Style</label>
                <select 
                  className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm focus:border-brand-accent outline-none appearance-none"
                  value={formData.fontFamily}
                  onChange={e => setFormData({...formData, fontFamily: e.target.value as any})}
                >
                  <option value="nanum">Nanum Barun Gothic (Default)</option>
                  <option value="instagram">Instagram (System)</option>
                  <option value="sans">Inter / Sans-Serif</option>
                  <option value="serif">System Serif</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Avatar URL</label>
                <input 
                  className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm focus:border-brand-accent outline-none"
                  value={formData.avatar}
                  onChange={e => setFormData({...formData, avatar: e.target.value})}
                />
              </div>
            </>
          )}

          {type === "posts" && formData.map((post: Post, idx: number) => (
            <div key={post.id} className="space-y-4 p-4 bg-black rounded-xl border border-zinc-800">
              <div className="flex gap-4 items-center">
                <img src={post.img || null} className="w-16 h-16 rounded-lg object-cover shadow-lg shrink-0" alt="prev" />
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Image URL</label>
                    <input 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs focus:border-brand-accent outline-none text-white"
                      value={post.img}
                      onChange={e => {
                        const newPosts = [...formData];
                        newPosts[idx].img = e.target.value;
                        setFormData(newPosts);
                      }}
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Likes</label>
                      <input 
                        type="number"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs focus:border-brand-accent outline-none text-white"
                        value={post.likes}
                        onChange={e => {
                          const newPosts = [...formData];
                          newPosts[idx].likes = parseInt(e.target.value) || 0;
                          setFormData(newPosts);
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Comments</label>
                      <input 
                        type="number"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs focus:border-brand-accent outline-none text-white"
                        value={post.commentsCount}
                        onChange={e => {
                          const newPosts = [...formData];
                          newPosts[idx].commentsCount = parseInt(e.target.value) || 0;
                          setFormData(newPosts);
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Time</label>
                      <input 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs focus:border-brand-accent outline-none text-white"
                        value={post.time}
                        onChange={e => {
                          const newPosts = [...formData];
                          newPosts[idx].time = e.target.value;
                          setFormData(newPosts);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Caption</label>
                <textarea 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs focus:border-brand-accent outline-none text-white h-20 resize-none"
                  value={post.caption}
                  onChange={e => {
                    const newPosts = [...formData];
                    newPosts[idx].caption = e.target.value;
                    setFormData(newPosts);
                  }}
                />
              </div>
            </div>
          ))}

          {type === "highlights" && (
            <>
              {formData.map((h: Highlight, idx: number) => (
                <div key={h.id} className="space-y-3 p-4 bg-black rounded-xl border border-zinc-800 relative group">
                   <button 
                     className="absolute top-2 right-2 text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                     onClick={() => {
                       const newHighlights = [...formData];
                       newHighlights.splice(idx, 1);
                       setFormData(newHighlights);
                     }}
                   >
                     <X size={16} />
                   </button>
                   <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-full border border-zinc-700 overflow-hidden shrink-0">
                        <img src={h.img || null} className="w-full h-full object-cover" alt="h" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <input 
                          placeholder="Title"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs focus:border-brand-accent outline-none text-white"
                          value={h.title}
                          onChange={e => {
                            const newHighlights = [...formData];
                            newHighlights[idx].title = e.target.value;
                            setFormData(newHighlights);
                          }}
                        />
                        <input 
                          placeholder="Image URL"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-[10px] focus:border-brand-accent outline-none text-white"
                          value={h.img}
                          onChange={e => {
                            const newHighlights = [...formData];
                            newHighlights[idx].img = e.target.value;
                            setFormData(newHighlights);
                          }}
                        />
                      </div>
                   </div>
                </div>
              ))}
              <div 
                onClick={() => {
                  setFormData([
                    ...formData,
                    {
                      id: Date.now(),
                      title: "새 하이라이트",
                      img: "https://picsum.photos/seed/new/200/200"
                    }
                  ]);
                }}
                className="w-full py-3 border-2 border-dashed border-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 hover:text-brand-accent hover:border-brand-accent transition-colors cursor-pointer text-sm font-semibold"
              >
                + 하이라이트 추가
              </div>
            </>
          )}

          {type === "comments" && formData.map((comment: Comment, idx: number) => (
            <div key={comment.id} className="space-y-3 p-4 bg-black rounded-xl border border-zinc-800">
               <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full border border-zinc-700 overflow-hidden shrink-0 mt-1">
                    <img src={comment.avatar || null} className="w-full h-full object-cover" alt="avatar" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex gap-2">
                       <div className="flex-1">
                          <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Username</label>
                          <input 
                            className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs focus:border-brand-accent outline-none font-bold text-white"
                            value={comment.user}
                            onChange={e => {
                              const newComments = [...formData];
                              newComments[idx].user = e.target.value;
                              setFormData(newComments);
                            }}
                          />
                       </div>
                       <div className="flex-1">
                          <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Avatar URL</label>
                          <input 
                            className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-[10px] focus:border-brand-accent outline-none text-zinc-400"
                            value={comment.avatar || ""}
                            onChange={e => {
                              const newComments = [...formData];
                              newComments[idx].avatar = e.target.value;
                              setFormData(newComments);
                            }}
                          />
                       </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Comment Text</label>
                      <textarea 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs focus:border-brand-accent outline-none min-h-[50px] text-[#f0f0f0] resize-none"
                        value={comment.text}
                        onChange={e => {
                          const newComments = [...formData];
                          newComments[idx].text = e.target.value;
                          setFormData(newComments);
                        }}
                      />
                    </div>
                    <div className="flex gap-2">
                       <div className="flex-1">
                          <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Likes</label>
                          <input 
                            type="number"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs focus:border-brand-accent outline-none text-white"
                            value={comment.likes}
                            onChange={e => {
                              const newComments = [...formData];
                              newComments[idx].likes = parseInt(e.target.value) || 0;
                              setFormData(newComments);
                            }}
                          />
                       </div>
                       <div className="flex-1">
                          <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Time</label>
                          <input 
                            className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs focus:border-brand-accent outline-none text-white"
                            value={comment.time}
                            onChange={e => {
                              const newComments = [...formData];
                              newComments[idx].time = e.target.value;
                              setFormData(newComments);
                            }}
                          />
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex gap-4">
          <button 
            onClick={() => onSave(formData)}
            className="flex-1 bg-brand-accent py-3 rounded-lg font-bold hover:bg-indigo-500 active:scale-95 transition-all text-sm"
          >
            변경 내용 저장
          </button>
          <button 
            onClick={onClose}
            className="flex-1 bg-zinc-800 py-3 rounded-lg font-bold hover:bg-zinc-700 transition-all text-sm text-zinc-400"
          >
            취소
          </button>
        </div>
      </motion.div>
    </div>
  );
};

interface User {
  id: number;
  name: string;
  avatar: string;
  status: string;
  lastMessage: string;
  isOnline: boolean;
}

interface Comment {
  id: number;
  user: string;
  avatar?: string;
  text: string;
  time: string;
  likes: number;
  isLiked: boolean;
}

const Highlights = ({ 
  highlights, 
  isAdmin, 
  onEdit 
}: { 
  highlights: Highlight[], 
  isAdmin: boolean, 
  onEdit: () => void 
}) => {
  return (
    <div className="max-w-4xl mx-auto px-6 mb-12 flex gap-6 md:gap-10 overflow-x-auto scrollbar-hide py-2 relative">
      {highlights.map((h, i) => (
        <motion.div 
          key={h.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
          className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group"
        >
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border border-zinc-800 p-1 group-hover:border-zinc-500 transition-colors">
            <div className="w-full h-full rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
              <img src={h.img || null} alt={h.title} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
            </div>
          </div>
          <span className="text-[11px] font-semibold tracking-tight">{h.title}</span>
        </motion.div>
      ))}
      
      {isAdmin && (
        <div 
          onClick={onEdit}
          className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group"
        >
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border border-zinc-800 p-1 group-hover:border-zinc-500 transition-colors flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <Settings size={18} className="text-zinc-600" />
            </div>
          </div>
          <span className="text-[11px] font-semibold tracking-tight">편집</span>
        </div>
      )}

      {/* Re-adding the New button for visual completeness */}
      {!isAdmin && (
         <div className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border border-zinc-800 p-1 group-hover:border-zinc-500 transition-colors flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
               <div className="text-2xl text-zinc-600">+</div>
            </div>
          </div>
          <span className="text-[11px] font-semibold tracking-tight">신규</span>
        </div>
      )}
    </div>
  );
};

const ProfileHeader = ({ 
  profile, 
  isAdmin,
  user,
  onMessageClick, 
  onEditProfile,
  onToggleEdit,
  onFollowChange
}: { 
  profile: ProfileData, 
  isAdmin: boolean,
  user: FirebaseUser | null,
  onMessageClick: () => void, 
  onEditProfile: () => void,
  onToggleEdit: () => void,
  onFollowChange: (isFollowing: boolean) => void
}) => {
  const [isFollowing, setIsFollowing] = useState(() => {
    return localStorage.getItem(`following_${profile.username}`) === 'true';
  });

  const displayFollowersCount = React.useMemo(() => {
    if (isAdmin) return profile.followersCount;
    return isFollowing 
      ? updateFormattedCount(profile.followersCount, 1) 
      : profile.followersCount;
  }, [profile.followersCount, isFollowing, isAdmin]);

  const handleFollow = () => {
    const nextState = !isFollowing;
    setIsFollowing(nextState);
    localStorage.setItem(`following_${profile.username}`, nextState.toString());
    onFollowChange(nextState);
  };

  return (
    <div className="max-w-4xl mx-auto pt-16 pb-12 px-6">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-20">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative group"
        >
          <div className="w-20 h-20 md:w-40 md:h-40 rounded-full p-1 bg-conic-to-tr from-brand-accent via-indigo-500 to-purple-500">
            <div className="w-full h-full rounded-full border-4 border-brand-bg overflow-hidden bg-zinc-900">
              <img 
                src={profile.avatar || null} 
                alt="Profile" 
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </motion.div>

        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
            <h1 
              onClick={(e) => {
                if (e.detail === 5) {
                  if (!user) {
                    signInWithGoogle().catch(console.error);
                  }
                  onToggleEdit();
                }
              }}
              className="text-xl md:text-2xl font-light tracking-tight flex items-center gap-1.5 cursor-pointer select-none"
            >
              {profile.username}
              {profile.username.endsWith(".official") && (
                <BadgeCheck size={20} className="text-[#0095f6] shrink-0" fill="currentColor" />
              )}
            </h1>
            <div className="flex gap-2">
              <button 
                onClick={handleFollow}
                className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300 w-28 md:w-32 ${
                  isFollowing ? "bg-zinc-800 text-white" : "bg-brand-accent text-white hover:bg-indigo-500"
                }`}
              >
                <AnimatePresence mode="wait">
                  <motion.span
                    key={isFollowing ? "following" : "follow"}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {isFollowing ? "팔로잉" : "팔로우"}
                  </motion.span>
                </AnimatePresence>
              </button>
              <button 
                onClick={onMessageClick}
                className="px-5 py-1.5 bg-zinc-800 rounded-lg text-sm font-semibold hover:bg-zinc-700 transition-colors"
                id="profile-message-btn"
              >
                메시지
              </button>
              {isAdmin && (
                <button 
                  onClick={onEditProfile}
                  className="px-5 py-1.5 bg-zinc-800 rounded-lg text-sm font-semibold hover:bg-zinc-700 transition-colors"
                  id="profile-edit-btn"
                >
                  프로필 편집
                </button>
              )}
              <button className="p-1.5 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors hidden md:block" id="profile-settings-btn">
                <Settings size={18} />
              </button>
            </div>
          </div>

          <div className="flex justify-center md:justify-start gap-8 mb-6 border-y md:border-none border-zinc-800 py-3 md:py-0 w-full">
            <div className="flex flex-col md:flex-row items-center gap-1 text-sm md:text-base">
              <span className="font-bold">{profile.postCount}</span> <span className="text-brand-muted">게시물</span>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-1 text-sm md:text-base">
              <span className="font-bold">{displayFollowersCount}</span> <span className="text-brand-muted">팔로워</span>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-1 text-sm md:text-base">
              <span className="font-bold">{profile.followingCount}</span> <span className="text-brand-muted">팔로잉</span>
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="font-bold">{profile.name}</h2>
            <div className="text-sm leading-relaxed max-w-md whitespace-pre-wrap">
              {profile.bio}
            </div>
            {profile.website && (
              <div className="flex items-center justify-center md:justify-start gap-1 pt-2">
                <LinkIcon size={12} className="text-brand-accent" />
                <a 
                  href={`https://${profile.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-brand-accent text-sm font-semibold hover:underline"
                >
                  {profile.website}
                </a>
              </div>
            )}
            <p className="text-[11px] text-zinc-500 mt-2 text-center md:text-left">
              {profile.followedByUsers?.join(", ")}
              <span className="font-bold text-white">님 외 {profile.followedByCount}명이 팔로우 합니다.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const PostGrid = ({ 
  posts, 
  isAdmin, 
  onPostClick, 
  onManagePosts 
}: { 
  posts: Post[], 
  isAdmin: boolean, 
  onPostClick: (post: Post) => void,
  onManagePosts: () => void 
}) => {
  const [activeTab, setActiveTab] = useState("POSTS");

  const tabs = [
    { id: "POSTS", icon: Grid, label: "게시물" },
    { id: "SAVED", icon: Bookmark, label: "저장됨" },
    { id: "TAGGED", icon: UserSquare, label: "태그됨" }
  ];

  return (
    <div className="max-w-4xl mx-auto border-t border-zinc-800">
      <div className="flex flex-col md:flex-row items-center justify-between">
        <div className="flex justify-center gap-12 w-full md:w-auto">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 text-xs font-bold tracking-widest transition-all border-t -mt-[1px] ${
                activeTab === tab.id ? "border-white text-white" : "border-transparent text-brand-muted hover:text-white"
              }`}
            >
              <tab.icon size={12} />
              {tab.label}
            </button>
          ))}
        </div>
        {isAdmin && activeTab === "POSTS" && (
          <button 
            onClick={onManagePosts}
            className="hidden md:flex items-center gap-2 py-4 text-[10px] font-bold text-brand-accent hover:text-white transition-colors tracking-widest uppercase"
          >
            게시물 관리
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "POSTS" ? (
          <motion.div 
            key="posts"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-3 gap-1 md:gap-6 pb-20 mt-4 md:mt-0"
          >
            {posts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onPostClick(post)}
                className="aspect-square relative group bg-zinc-900 cursor-pointer overflow-hidden rounded-sm md:rounded-lg"
              >
                <img 
                  src={post.img || null} 
                  alt={`Post ${post.id}`} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 md:gap-8">
                  <div className="flex items-center gap-1 font-bold text-white">
                    <Heart size={20} fill="white" /> {post.likes.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1 font-bold text-white">
                    <MessageCircle size={20} fill="white" /> {post.commentsCount ?? post.comments.length}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-full border border-zinc-500 flex items-center justify-center mb-6">
              {activeTab === "SAVED" ? <Bookmark size={32} className="text-zinc-400" /> : <UserSquare size={32} className="text-zinc-400" />}
            </div>
            <h3 className="text-2xl md:text-3xl font-bold mb-2">
              {activeTab === "SAVED" ? "저장됨" : "회원님이 태그된 사진"}
            </h3>
            <p className="text-brand-muted max-w-xs text-sm">
              {activeTab === "SAVED" 
                ? "다시 보고 싶은 사진과 동영상을 저장하세요. 콘텐츠를 저장해도 상대방에게 알림이 가지 않으며, 저장된 콘텐츠는 회원님만 볼 수 있습니다." 
                : "회원님이 태그된 사진이나 동영상이 여기에 표시됩니다."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PostModal = ({ 
  post, 
  profile,
  isAdmin,
  onClose,
  onEditComments,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  onUpdateCaption
}: { 
  key?: string, 
  post: Post, 
  profile: ProfileData,
  isAdmin: boolean,
  onClose: () => void,
  onEditComments: () => void,
  onAddComment: (postId: number, text: string) => void,
  onUpdateComment: (postId: number, commentId: number, text: string, time: string, likes: number) => void,
  onDeleteComment: (postId: number, commentId: number) => void,
  onUpdateCaption: (postId: number, text: string, time: string, likes: number, commentsCount: number) => void
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [comments, setComments] = useState<Comment[]>(Array.isArray(post.comments) ? post.comments : []);
  const [newCommentText, setNewCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingTime, setEditingTime] = useState("");
  const [editingLikes, setEditingLikes] = useState(0);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [captionText, setCaptionText] = useState(post.caption);
  const [captionTime, setCaptionTime] = useState(post.time);
  const [captionLikes, setCaptionLikes] = useState(post.likes);
  const [captionCommentsCount, setCaptionCommentsCount] = useState(post.commentsCount || 0);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    setComments(Array.isArray(post.comments) ? post.comments : []);
    setCaptionText(post.caption);
    setCaptionTime(post.time);
    setCaptionLikes(post.likes);
    setCaptionCommentsCount(post.commentsCount || 0);
  }, [post.comments, post.caption, post.time, post.likes, post.commentsCount]);

  const handlePostComment = () => {
    if (!newCommentText.trim()) return;
    onAddComment(post.id, newCommentText);
    setNewCommentText("");
  };

  const handleSaveEdit = (commentId: number) => {
    if (!editingText.trim()) return;
    onUpdateComment(post.id, commentId, editingText, editingTime, editingLikes);
    setEditingCommentId(null);
  };

  const handleSaveCaption = () => {
    onUpdateCaption(post.id, captionText, captionTime, captionLikes, captionCommentsCount);
    setIsEditingCaption(false);
  };

  const toggleCommentLike = (id: number) => {
    setComments(prev => prev.map(c => 
      c.id === id ? { ...c, isLiked: !c.isLiked, likes: c.isLiked ? c.likes - 1 : c.likes + 1 } : c
    ));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-10">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative bg-black w-full max-w-5xl md:h-[90vh] flex flex-col md:flex-row rounded-none md:rounded-xl overflow-hidden border border-zinc-800"
      >
        <button onClick={onClose} className="absolute top-4 right-4 z-[110] text-white">
          <X size={24} />
        </button>

        {/* Image Section */}
        <div className="w-full md:w-3/5 bg-zinc-900 flex items-center justify-center overflow-hidden">
          <img 
            src={post.img || null} 
            alt="View" 
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Content Section */}
        <div className="w-full md:w-2/5 flex flex-col bg-black">
          {/* Header */}
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-accent overflow-hidden">
                <img src={profile.avatar || null} alt="logo" />
              </div>
              <span className="font-bold text-sm flex items-center gap-1 cursor-pointer">
                {profile.username}
                {profile.username.endsWith(".official") && (
                  <BadgeCheck size={14} className="text-[#0095f6] shrink-0" fill="currentColor" />
                )}
              </span>
            </div>
            <div className="flex items-center gap-3">
               {isAdmin && (
                 <button 
                  onClick={onEditComments}
                  className="text-[10px] font-bold text-brand-accent hover:text-white transition-colors"
                 >
                   댓글 편집
                 </button>
               )}
               <MoreHorizontal size={18} className="text-zinc-400" />
            </div>
          </div>

          {/* Comments */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide hidden md:block">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-accent shrink-0 overflow-hidden">
                 <img src={profile.avatar || null} alt="logo" />
              </div>
              <div className="flex-1">
                {isEditingCaption ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                       <div className="flex-1">
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Caption</label>
                          <textarea 
                            autoFocus
                            value={captionText}
                            onChange={(e) => setCaptionText(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm focus:border-brand-accent outline-none text-white h-20 resize-none"
                            placeholder="Caption"
                          />
                       </div>
                    </div>
                    <div className="flex gap-3 mt-2">
                       <div className="flex-1">
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Time</label>
                          <input 
                            type="text"
                            value={captionTime}
                            onChange={(e) => setCaptionTime(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs focus:border-brand-accent outline-none text-zinc-400"
                            placeholder="Post time (e.g., 2h, 1d, 3w)"
                          />
                       </div>
                       <div className="flex-1">
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Likes</label>
                          <input 
                            type="number"
                            value={captionLikes}
                            onChange={(e) => setCaptionLikes(parseInt(e.target.value) || 0)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs focus:border-brand-accent outline-none text-white"
                          />
                       </div>
                       <div className="flex-1">
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Comments</label>
                          <input 
                            type="number"
                            value={captionCommentsCount}
                            onChange={(e) => setCaptionCommentsCount(parseInt(e.target.value) || 0)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs focus:border-brand-accent outline-none text-white"
                          />
                       </div>
                    </div>
                    <div className="flex gap-2 mt-2 text-[10px] font-bold">
                      <button onClick={handleSaveCaption} className="text-brand-accent uppercase">저장</button>
                      <button onClick={() => setIsEditingCaption(false)} className="text-zinc-500 uppercase">취소</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap text-[#cdcdcd] leading-snug">
                      <span className="font-bold mr-2 text-white inline-flex items-center gap-0.5 cursor-pointer">
                        {profile.username}
                        {profile.username.endsWith(".official") && (
                          <BadgeCheck size={14} className="text-[#0095f6] shrink-0" fill="currentColor" />
                        )}
                      </span>
                      {post.caption}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-brand-muted font-semibold">
                       <span>{post.time}</span>
                       {isAdmin && (
                         <button onClick={() => setIsEditingCaption(true)} className="hover:text-white transition-colors">편집</button>
                       )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {comments.map(comment => (
              <div key={comment.id} className="flex gap-3 group">
                <div className="w-8 h-8 rounded-full bg-zinc-800 shrink-0 overflow-hidden">
                  <img src={comment.avatar || `https://picsum.photos/seed/${comment.user}/100/100` || null} alt="user" />
                </div>
                <div className="flex-1 text-zinc-100">
                  {editingCommentId === comment.id ? (
                    <div className="space-y-2">
                      <textarea 
                        autoFocus
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm focus:border-brand-accent outline-none text-[#f0f0f0]"
                        placeholder="Comment"
                      />
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <input 
                            type="text"
                            value={editingTime}
                            onChange={(e) => setEditingTime(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs focus:border-brand-accent outline-none text-zinc-400"
                            placeholder="Comment time"
                          />
                        </div>
                        <div className="flex-1">
                          <input 
                            type="number"
                            value={editingLikes}
                            onChange={(e) => setEditingLikes(parseInt(e.target.value) || 0)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs focus:border-brand-accent outline-none text-white"
                            placeholder="Likes"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 text-[10px] font-bold">
                        <button onClick={() => handleSaveEdit(comment.id)} className="text-brand-accent uppercase">Save</button>
                        <button onClick={() => setEditingCommentId(null)} className="text-zinc-500 uppercase">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm whitespace-pre-wrap text-[#cdcdcd] leading-snug">
                        <span className="font-bold mr-2 text-white inline-flex items-center gap-0.5 cursor-pointer">
                          {comment.user}
                          {comment.user.endsWith(".official") && (
                            <BadgeCheck size={14} className="text-[#0095f6] shrink-0" fill="currentColor" />
                          )}
                        </span>
                        {comment.text}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-brand-muted font-semibold">
                        <span>{comment.time}</span>
                        <span>좋아요 {comment.likes}개</span>
                        <button className="hover:text-zinc-300">답글 달기</button>
                        {isAdmin && (
                          <div className="flex gap-4">
                            <button 
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditingText(comment.text);
                                setEditingTime(comment.time);
                                setEditingLikes(comment.likes);
                              }}
                              className="hover:text-white transition-colors"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => onDeleteComment(post.id, comment.id)}
                              className="hover:text-red-500 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <button 
                  onClick={() => toggleCommentLike(comment.id)}
                  className={`mt-1 h-fit transition-colors ${comment.isLiked ? "text-red-500" : "text-zinc-600 hover:text-zinc-400"}`}
                >
                  <Heart size={12} fill={comment.isLiked ? "currentColor" : "none"} />
                </button>
              </div>
            ))}
          </div>

          {/* Action Footer */}
          <div className="p-4 border-t border-zinc-800">
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsLiked(!isLiked)}
                  className={`transition-transform active:scale-125 ${isLiked ? "text-red-500" : "text-white"}`}
                >
                  <Heart size={24} fill={isLiked ? "currentColor" : "none"} />
                </button>
                <MessageCircle size={24} />
                <Send size={24} />
              </div>
              <Bookmark size={24} />
            </div>
            <p className="font-bold text-sm mb-1">좋아요 {(isLiked ? post.likes + 1 : post.likes).toLocaleString()}개</p>
            <p className="text-[10px] uppercase text-brand-muted tracking-wide">May 5, 2026</p>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-zinc-800 flex items-start gap-3">
            <Smile size={24} className="text-zinc-400 mt-1 shrink-0" />
            <textarea 
              placeholder="댓글 달기..." 
              className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-zinc-500 resize-none max-h-32 py-1 text-[#f0f0f0]"
              rows={1}
              value={newCommentText}
              onChange={(e) => {
                setNewCommentText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
            />
            <button 
              onClick={handlePostComment}
              disabled={!newCommentText.trim()}
              className="text-brand-accent font-bold text-sm disabled:opacity-50 pt-1 shrink-0"
            >
              Post
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const DMOverlay = ({ 
  onClose, 
  chats, 
  setChats, 
  isAdmin,
  profileUsername
}: { 
  key?: string, 
  onClose: () => void,
  chats: ChatUser[],
  setChats: React.Dispatch<React.SetStateAction<ChatUser[]>>,
  isAdmin: boolean,
  profileUsername: string
}) => {
  const [selectedUserId, setSelectedUserId] = useState<number>(chats[0]?.id || 0);
  const [editingChatId, setEditingChatId] = useState<number | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [tempChat, setTempChat] = useState<ChatUser | null>(null);
  const [tempMessage, setTempMessage] = useState<ChatMessage | null>(null);
  const [newMessageText, setNewMessageText] = useState("");
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);
  const [senderType, setSenderType] = useState<'me' | 'them'>('me');

  const selectedUser = chats.find(u => u.id === selectedUserId) || chats[0];

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleUpdateChat = async (updatedChat: ChatUser) => {
    try {
      await setDoc(doc(db, "chats", updatedChat.id.toString()), updatedChat);
      setEditingChatId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${updatedChat.id}`);
    }
  };

  const handleUpdateMessage = async (updatedMessage: ChatMessage) => {
    if (!selectedUser) return;
    try {
      const updatedChat = {
        ...selectedUser,
        messages: selectedUser.messages.map(m => m.id === updatedMessage.id ? updatedMessage : m)
      };
      await setDoc(doc(db, "chats", selectedUserId.toString()), updatedChat);
      setEditingMessageId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${selectedUserId}`);
    }
  };

  const handleDeleteMessage = async (msgId: number) => {
    if (!selectedUser) return;
    try {
      const updatedChat = {
        ...selectedUser,
        messages: selectedUser.messages.filter(m => m.id !== msgId)
      };
      await setDoc(doc(db, "chats", selectedUserId.toString()), updatedChat);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${selectedUserId}`);
    }
  };

  const handleForwardMessage = async (targetUserId: number) => {
    if (!forwardingMessage) return;
    const targetChat = chats.find(c => c.id === targetUserId);
    if (!targetChat) return;
    
    try {
      const updatedChat = {
        ...targetChat,
        messages: [...targetChat.messages, {
          ...forwardingMessage,
          id: Date.now(),
          sender: 'me' as const,
          time: "방금"
        }]
      };
      await setDoc(doc(db, "chats", targetUserId.toString()), updatedChat);
      setForwardingMessage(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${targetUserId}`);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessageText.trim() || !selectedUser) return;
    const newMessage: ChatMessage = {
      id: Date.now(),
      sender: senderType,
      text: newMessageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    try {
      const updatedChat = {
        ...selectedUser,
        messages: [...selectedUser.messages, newMessage]
      };
      await setDoc(doc(db, "chats", selectedUserId.toString()), updatedChat);
      setNewMessageText("");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${selectedUserId}`);
    }
  };

  const handleAddChat = async () => {
    const newChat: ChatUser = {
      id: Date.now(),
      name: "New Partner",
      avatar: "https://picsum.photos/seed/new/100/100",
      status: "Active now",
      subtitle: "Instagram User",
      isOnline: true,
      messages: [{ id: 1, sender: 'them', text: "Hello!", time: "Just now" }]
    };
    try {
      await setDoc(doc(db, "chats", newChat.id.toString()), newChat);
      setSelectedUserId(newChat.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${newChat.id}`);
    }
  };

  const handleDeleteChat = async (id: number) => {
    if (chats.length <= 1) return;
    try {
      await deleteDoc(doc(db, "chats", id.toString()));
      if (selectedUserId === id) {
        const nextChats = chats.filter(c => c.id !== id);
        setSelectedUserId(nextChats[0].id);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${id}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black">
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-full md:w-80 border-r border-zinc-800 flex flex-col">
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">{profileUsername}</span>
              <ChevronLeft className="rotate-[-90deg] text-zinc-400" size={16} />
            </div>
            <div className="flex gap-4 items-center">
              {isAdmin && (
                <button onClick={handleAddChat} className="text-brand-accent p-1 hover:bg-zinc-800 rounded">
                  <div className="text-xl font-bold">+</div>
                </button>
              )}
              <button onClick={onClose} className="md:hidden"><ChevronLeft size={24} /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2 scrollbar-hide">
            <h3 className="px-3 pb-4 font-bold text-sm tracking-tight text-white/50">메시지</h3>
            {chats.map(user => (
              <div 
                key={user.id} 
                className="group relative"
              >
                <div
                  onClick={() => setSelectedUserId(user.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer ${
                    selectedUserId === user.id ? "bg-zinc-800/50" : "hover:bg-zinc-900"
                  }`}
                >
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full p-0.5 ${user.isOnline ? "bg-green-500" : "bg-zinc-700"}`}>
                      <div className="w-full h-full rounded-full border-2 border-black overflow-hidden bg-zinc-900">
                        <img src={user.avatar || null} alt={user.name} />
                      </div>
                    </div>
                    {user.isOnline && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-black rounded-full" />}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-bold text-sm truncate">{user.name}</p>
                    <p className={`text-xs truncate ${selectedUserId === user.id ? "text-white" : "text-brand-muted"}`}>
                      {user.messages[user.messages.length - 1]?.text || "No messages"}
                    </p>
                  </div>
                </div>
                {isAdmin && (
                   <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteChat(user.id); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 bg-red-500/20 text-red-500 p-1.5 rounded-lg hover:bg-red-500/40 transition-all"
                   >
                     <X size={14} />
                   </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="hidden md:flex flex-1 flex-col relative overflow-hidden bg-zinc-950">
           <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-black/50 backdrop-blur-md">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full border border-zinc-800 overflow-hidden shrink-0">
                 <img src={selectedUser.avatar || null} alt="avatar" />
               </div>
               {editingChatId === selectedUser.id ? (
                 <div className="flex flex-col gap-1">
                   <input 
                      className="bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-sm outline-none focus:border-brand-accent text-white"
                      value={tempChat?.name || ""}
                      onChange={e => setTempChat(prev => prev ? {...prev, name: e.target.value} : null)}
                   />
                   <div className="flex gap-2 items-center">
                      <input 
                         className="bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-[10px] outline-none focus:border-brand-accent text-zinc-400 flex-1"
                         value={tempChat?.status || ""}
                         onChange={e => setTempChat(prev => prev ? {...prev, status: e.target.value} : null)}
                      />
                      <label className="flex items-center gap-1 text-[10px] text-zinc-400 cursor-pointer pt-1">
                        <input type="checkbox" checked={tempChat?.isOnline || false} onChange={e => setTempChat(prev => prev ? {...prev, isOnline: e.target.checked} : null)} className="accent-brand-accent h-3 w-3" />
                        <span>활동중</span>
                      </label>
                   </div>
                 </div>
               ) : (
                 <div className="text-left">
                    <span className="font-bold block text-sm">{selectedUser.name}</span>
                    <span className="text-[10px] text-zinc-500">{selectedUser.status}</span>
                 </div>
               )}
             </div>
             <div className="flex items-center gap-6 text-zinc-400">
                {isAdmin && (
                  editingChatId === selectedUser.id ? (
                    <div className="flex gap-2">
                       <button onClick={() => tempChat && handleUpdateChat(tempChat)} className="text-[10px] font-bold text-brand-accent uppercase">저장</button>
                       <button onClick={() => setEditingChatId(null)} className="text-[10px] font-bold text-zinc-500 uppercase">취소</button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => {
                        setEditingChatId(selectedUser.id);
                        setTempChat(selectedUser);
                      }} 
                      className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase"
                    >
                      대화 상대 편집
                    </button>
                  )
                )}
                <button onClick={onClose} className="hover:text-white transition-colors"><X size={20} /></button>
             </div>
           </div>

           <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
              <div className="flex justify-center my-10">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-brand-accent mx-auto mb-4 overflow-hidden border-2 border-zinc-800 shadow-xl group relative">
                    <img src={selectedUser.avatar || null} alt="large-avatar" />
                    {isAdmin && editingChatId === selectedUser.id && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-2">
                        <textarea 
                          className="bg-transparent border-none outline-none text-[8px] text-white text-center resize-none w-full"
                          value={tempChat?.avatar || ""}
                          onChange={e => setTempChat(prev => prev ? {...prev, avatar: e.target.value} : null)}
                          placeholder="Pic URL"
                        />
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-xl">{selectedUser.name}</h3>
                  {editingChatId === selectedUser.id ? (
                    <input 
                      className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-sm outline-none focus:border-brand-accent text-white mt-1 text-center"
                      value={tempChat?.subtitle || ""}
                      onChange={e => setTempChat(prev => prev ? {...prev, subtitle: e.target.value} : null)}
                    />
                  ) : (
                    <p className="text-brand-muted text-sm mb-4">{selectedUser.subtitle}</p>
                  )}
                  <button className="px-4 py-1.5 bg-zinc-800 rounded-lg text-sm font-semibold hover:bg-zinc-700 transition-colors mt-4">프로필 보기</button>
                </div>
              </div>

              {selectedUser.messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'} group max-w-full`}>
                   {msg.sender === 'them' && (
                     <div className="w-7 h-7 rounded-full border border-zinc-800 mr-2 shrink-0 overflow-hidden self-end">
                       <img src={selectedUser.avatar || null} alt="mini" />
                     </div>
                   )}
                   
                   <div className="relative group max-w-[70%]">
                     {editingMessageId === msg.id ? (
                       <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl space-y-2">
                          <textarea 
                            className="bg-transparent border-none outline-none text-sm w-full text-white resize-none"
                            value={tempMessage?.text || ""}
                            onChange={e => setTempMessage(prev => prev ? {...prev, text: e.target.value} : null)}
                          />
                          <input 
                            className="bg-transparent border-none outline-none text-[10px] w-full text-zinc-500"
                            value={tempMessage?.time || ""}
                            onChange={e => setTempMessage(prev => prev ? {...prev, time: e.target.value} : null)}
                          />
                          <div className="flex gap-2">
                            <button onClick={() => tempMessage && handleUpdateMessage(tempMessage)} className="text-[10px] font-bold text-brand-accent uppercase">저장</button>
                            <button onClick={() => setEditingMessageId(null)} className="text-[10px] font-bold text-zinc-500 uppercase">취소</button>
                          </div>
                       </div>
                     ) : (
                       <div 
                        className={`px-4 py-2 rounded-2xl text-sm transition-all relative ${
                          msg.sender === 'me' 
                            ? 'bg-brand-accent rounded-tr-sm text-white' 
                            : 'bg-zinc-800 rounded-tl-sm text-zinc-200 hover:bg-zinc-700'
                        }`}
                       >
                         {msg.text}
                         <span className={`text-[9px] block mt-1 opacity-50 ${msg.sender === 'me' ? 'text-right' : 'text-left'}`}>
                           {msg.time}
                         </span>
                       </div>
                     )}

                     {isAdmin && editingMessageId !== msg.id && (
                       <div className={`absolute top-0 opacity-0 group-hover:opacity-100 flex gap-1 transition-all ${
                          msg.sender === 'me' ? '-left-20' : '-right-20'
                        }`}>
                         <button 
                          onClick={() => {
                            setEditingMessageId(msg.id);
                            setTempMessage(msg);
                          }}
                          className="text-[9px] font-bold text-zinc-500 hover:text-white p-1 whitespace-nowrap bg-black/50 rounded"
                         >
                           편집
                         </button>
                         <button 
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="text-[9px] font-bold text-red-500/70 hover:text-red-500 p-1 whitespace-nowrap bg-black/50 rounded"
                         >
                           삭제
                         </button>
                         <button 
                          onClick={() => setForwardingMessage(msg)}
                          className="text-[9px] font-bold text-brand-accent hover:text-white p-1 whitespace-nowrap bg-black/50 rounded"
                         >
                           전달
                         </button>
                       </div>
                     )}
                   </div>
                </div>
              ))}
           </div>

           <div className="p-4 bg-zinc-950">
              <div className="flex items-center gap-4 border border-zinc-700 rounded-full px-4 py-1 bg-zinc-900/50">
                 {isAdmin && (
                   <button 
                    onClick={() => setSenderType(prev => prev === 'me' ? 'them' : 'me')}
                    className={`shrink-0 text-[10px] font-black px-2 py-1 rounded transition-all select-none ${
                      senderType === 'me' ? 'bg-brand-accent text-white' : 'bg-zinc-700 text-zinc-300'
                    }`}
                   >
                     {senderType === 'me' ? 'ME' : 'THEM'}
                   </button>
                 )}
                <Smile size={24} className="text-zinc-400 cursor-pointer" />
                <input 
                  type="text" 
                  placeholder={senderType === 'me' ? "메시지 보내기..." : `${selectedUser.name}님에게 메시지 보내기...`}
                  className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-zinc-500 text-white py-2"
                  value={newMessageText}
                  onChange={e => setNewMessageText(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                />
                <button 
                  onClick={handleSendMessage}
                  className="text-brand-accent font-bold text-sm px-2 disabled:opacity-50"
                  disabled={!newMessageText.trim()}
                >
                  보내기
                </button>
              </div>
           </div>
        </div>

        <AnimatePresence>
          {forwardingMessage && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/80" onClick={() => setForwardingMessage(null)} />
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-sm shadow-2xl">
                <h3 className="text-lg font-bold mb-4">전달하기</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {chats.filter(c => c.id !== selectedUserId).map(c => (
                    <button 
                      key={c.id}
                      onClick={() => handleForwardMessage(c.id)}
                      className="w-full flex items-center gap-3 p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <img src={c.avatar} className="w-8 h-8 rounded-full" alt="avatar" />
                      <span className="font-semibold text-sm">{c.name}</span>
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setForwardingMessage(null)}
                  className="w-full mt-6 bg-zinc-800 py-2 rounded-lg text-sm font-bold text-zinc-400 hover:text-white transition-colors"
                >
                  취소
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Mobile View Placeholder */}
        <div className="md:hidden flex-1 flex flex-col bg-zinc-950">
           <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-black/50 backdrop-blur-md">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full border border-zinc-800 overflow-hidden">
                 <img src={selectedUser.avatar || null} alt="avatar" />
               </div>
               <div className="text-left">
                  <span className="font-bold block text-sm">{selectedUser.name}</span>
               </div>
             </div>
             <button onClick={onClose} className="hover:text-white transition-colors"><X size={20} /></button>
           </div>
           <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                 {selectedUser.messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                       <div className={`px-4 py-2 rounded-2xl text-sm ${
                         msg.sender === 'me' ? 'bg-brand-accent rounded-tr-sm' : 'bg-zinc-800 rounded-tl-sm'
                       }`}>
                         {msg.text}
                       </div>
                    </div>
                 ))}
              </div>
              <div className="p-4 bg-zinc-950">
                <div className="flex items-center gap-4 border border-zinc-700 rounded-full px-4 py-1 bg-zinc-900/50">
                  {isAdmin && (
                    <button 
                      onClick={() => setSenderType(prev => prev === 'me' ? 'them' : 'me')}
                      className={`shrink-0 text-[10px] font-black px-2 py-1 rounded transition-all select-none ${
                        senderType === 'me' ? 'bg-brand-accent text-white' : 'bg-zinc-700 text-zinc-300'
                      }`}
                    >
                      {senderType === 'me' ? 'ME' : 'THEM'}
                    </button>
                  )}
                  <input 
                    type="text" 
                    placeholder={senderType === 'me' ? "메시지 보내기..." : `${selectedUser.name}님에게 메시지 보내기...`}
                    className="flex-1 bg-transparent border-none outline-none text-sm py-2"
                    value={newMessageText}
                    onChange={e => setNewMessageText(e.target.value)}
                  />
                  <button onClick={handleSendMessage} className="text-brand-accent font-bold text-sm">보내기</button>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};


function updateFormattedCount(current: string, delta: number): string {
  if (!current) return delta > 0 ? "1" : "0";
  
  const multiplierMatch = current.match(/[kKMm]$/);
  const multiplier = multiplierMatch 
    ? (multiplierMatch[0].toLowerCase() === 'k' ? 1000 : 1000000) 
    : 1;
  
  const numericStr = current.replace(/[^0-9.]/g, '');
  const numericPart = parseFloat(numericStr) || 0;
  
  const totalValue = (numericPart * multiplier) + delta;
  
  if (totalValue < 0) return "0";

  // If there was no k or m multiplier, just use comma formatting
  if (!multiplierMatch) {
    return Math.floor(totalValue).toLocaleString('en-US');
  }
  
  if (totalValue >= 1000000) {
    const val = (totalValue / 1000000).toFixed(1).replace(/\.0$/, '');
    return val + 'M';
  }
  if (totalValue >= 1000) {
    const val = (totalValue / 1000).toFixed(1).replace(/\.0$/, '');
    return val + 'k';
  }
  return Math.floor(totalValue).toString();
}

const LockScreen = ({ onUnlock, isReady }: { onUnlock: () => void, isReady: boolean }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ y: "-100%", opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} 
      className="fixed inset-0 z-[9999] bg-black bg-no-repeat bg-center flex flex-col items-center justify-between py-16 cursor-pointer"
      style={{ backgroundImage: 'url("/lock_bg.png")', backgroundSize: 'contain' }}
      onClick={() => {
        if (isReady) onUnlock();
      }}
    >
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/40" />

      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
        className="relative flex flex-col items-center mt-12 text-white z-10 w-full px-6"
      >
        <div className="flex items-center space-x-2 text-xl font-medium tracking-wide mb-2 opacity-90 drop-shadow-md">
          <span>{time.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}</span>
        </div>
        <div className="text-8xl font-medium tracking-tighter drop-shadow-lg">
          {time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
        </div>
      </motion.div>
      
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
        className="relative flex flex-col items-center mb-8 text-white z-10"
      >
         <motion.div 
           animate={{ y: [0, -8, 0] }}
           transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
           className="mb-2"
         >
           <ChevronUp className="w-6 h-6 opacity-80" strokeWidth={3} />
         </motion.div>
         <span className="text-[13px] font-bold tracking-widest uppercase opacity-90 drop-shadow-md">
           {isReady ? "위로 쓸어올려서 열기" : "로딩 중..."}
         </span>
      </motion.div>
    </motion.div>
  );
};

export default function App() {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isDMOpen, setIsDMOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState<"profile" | "posts" | "highlights" | "comments" | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [showLockScreen, setShowLockScreen] = useState(true);

  // Hidden Dev Mode Toggle: Alt + Shift + E
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.key === 'E') {
        setIsEditMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      unsubscribeAuth();
    };
  }, []);

  const isAdmin = isEditMode || (user?.email === 'kid81338@gmail.com');

  // Firebase Real-time listeners
  const [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE);

  useEffect(() => {
    // Apply font family globally via CSS variable
    const root = document.documentElement;
    if (profile.fontFamily === 'instagram') {
      root.style.setProperty('--app-font', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif');
    } else if (profile.fontFamily === 'sans') {
      root.style.setProperty('--app-font', '"Inter", ui-sans-serif, system-ui, sans-serif');
    } else if (profile.fontFamily === 'serif') {
      root.style.setProperty('--app-font', 'serif');
    } else {
      root.style.setProperty('--app-font', '"NanumBarunGothic", sans-serif');
    }
  }, [profile.fontFamily]);
  const [posts, setPosts] = useState<Post[]>(DEFAULT_POSTS);
  const [chats, setChats] = useState<ChatUser[]>(DEFAULT_CHATS);
  const [highlights, setHighlights] = useState<Highlight[]>(DEFAULT_HIGHLIGHTS);

  const profileLoadedRef = useRef(false);
  const postsLoadedRef = useRef(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const checkInitialization = () => {
    if (profileLoadedRef.current && postsLoadedRef.current) {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    const profileRef = doc(db, "profiles", "main");
    const unsubscribeProfile = onSnapshot(profileRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as ProfileData;
        
        // Auto-fix: force reduction to 7 as requested once
        if (data.postCount > 10 || (data.postCount > 7 && !localStorage.getItem('initial_post_trim_v2'))) {
          localStorage.setItem('initial_post_trim_v2', 'true');
          handleSaveProfile({ ...data, postCount: 7 });
          return;
        }

        setProfile({
          ...DEFAULT_PROFILE,
          ...data,
          followedByUsers: data.followedByUsers || DEFAULT_PROFILE.followedByUsers,
          followedByCount: typeof data.followedByCount === 'number' ? data.followedByCount : DEFAULT_PROFILE.followedByCount
        });
      }
      profileLoadedRef.current = true;
      checkInitialization();
    }, (error) => handleFirestoreError(error, OperationType.GET, "profiles/main"));

    const postsQuery = query(collection(db, "posts"), where("id", ">=", 0), orderBy("id", "asc"));
    const unsubscribePosts = onSnapshot(postsQuery, async (snapshot) => {
      const postsData: Post[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        postsData.push({ 
          ...data, 
          id: data.id || parseInt(docSnap.id),
          comments: Array.isArray(data.comments) ? data.comments : [] 
        } as Post);
      });
      
      // If we have more than 7 posts and we haven't trimmed yet, perform a one-time cleanup
      if (postsData.length > 7 && user?.email === 'kid81338@gmail.com') {
         const toDelete = postsData.slice(7);
         for (const post of toDelete) {
           await deleteDoc(doc(db, "posts", post.id.toString())).catch(e => console.error("Del err", e));
         }
      }

      // Always limit displayed posts to the first 7 on frontend if the delete hasn't kicked in or they are not admin
      const displayPosts = postsData.slice(0, 7);
      if (displayPosts.length > 0) setPosts(displayPosts);
      
      postsLoadedRef.current = true;
      checkInitialization();
    }, (error) => handleFirestoreError(error, OperationType.LIST, "posts"));

    const highlightsQuery = query(collection(db, "highlights"), where("id", ">=", 0), orderBy("id", "asc"));
    const unsubscribeHighlights = onSnapshot(highlightsQuery, (snapshot) => {
      const hData: Highlight[] = [];
      snapshot.forEach(docSnap => {
        hData.push({ ...docSnap.data(), id: parseInt(docSnap.id) } as Highlight);
      });
      if (hData.length > 0) setHighlights(hData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "highlights"));

    const chatsQuery = query(collection(db, "chats"), where("id", ">=", 0), orderBy("id", "asc"));
    const unsubscribeChats = onSnapshot(chatsQuery, (snapshot) => {
      const cData: ChatUser[] = [];
      snapshot.forEach(docSnap => {
        cData.push({ ...docSnap.data(), id: parseInt(docSnap.id) } as ChatUser);
      });
      if (cData.length > 0) setChats(cData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "chats"));

    return () => {
      unsubscribeProfile();
      unsubscribePosts();
      unsubscribeHighlights();
      unsubscribeChats();
    };
  }, []);

  const handleSaveProfile = async (newData: ProfileData) => {
    try {
      // Enforce hard limit of 7
      const targetCount = Math.min(7, newData.postCount);
      const profileToSave = { ...newData, postCount: targetCount };
      
      await setDoc(doc(db, "profiles", "main"), profileToSave);
      
      // Fetch ALL current posts directly to ensure we have the full list for cleanup
      const postsSnap = await getDocs(query(collection(db, "posts"), where("id", ">=", 0), orderBy("id", "asc")));
      const allPosts: Post[] = [];
      postsSnap.forEach(snap => {
        allPosts.push({ ...snap.data(), id: snap.data().id || parseInt(snap.id) } as Post);
      });

      const currentPostsCount = allPosts.length;

      if (targetCount > currentPostsCount) {
        const diff = targetCount - currentPostsCount;
        const maxId = allPosts.length > 0 ? Math.max(...allPosts.map(p => p.id)) : 0;
        
        for (let i = 1; i <= diff; i++) {
          const newId = maxId + i;
          const newPost: Post = {
            id: newId,
            img: `https://picsum.photos/seed/p${newId}/600/600`,
            likes: Math.floor(Math.random() * 1500) + 100,
            caption: "새로운 소식입니다.",
            time: "방금",
            commentsCount: 0,
            comments: []
          };
          await setDoc(doc(db, "posts", newId.toString()), newPost);
        }
      } else if (targetCount < currentPostsCount) {
        // Keep only top N posts, delete the rest
        const sortedPosts = [...allPosts].sort((a, b) => a.id - b.id);
        const toDelete = sortedPosts.slice(targetCount);
        
        for (const post of toDelete) {
          await deleteDoc(doc(db, "posts", post.id.toString()));
        }
      }

      setShowEditModal(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "profiles/main");
    }
  };

  const handleSavePosts = async (newPosts: Post[]) => {
    try {
      for (const post of newPosts) {
        await setDoc(doc(db, "posts", post.id.toString()), post);
      }
      setPosts(newPosts);
      setShowEditModal(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "posts");
    }
  };

  const handleSaveHighlights = async (newHighlights: Highlight[]) => {
    try {
      const highlightsSnap = await getDocs(query(collection(db, "highlights"), where("id", ">=", 0)));
      const existingIds = highlightsSnap.docs.map(doc => parseInt(doc.id));
      const newIds = newHighlights.map(h => h.id);
      
      for (const id of existingIds) {
        if (!newIds.includes(id)) {
          await deleteDoc(doc(db, "highlights", id.toString()));
        }
      }

      for (const h of newHighlights) {
        await setDoc(doc(db, "highlights", h.id.toString()), h);
      }
      
      setHighlights(newHighlights);
      setShowEditModal(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "highlights");
    }
  };

  const handleAddComment = async (postId: number, text: string) => {
    const postToUpdate = posts.find(p => p.id === postId);
    if (!postToUpdate) return;

    const newComment: Comment = {
      id: Date.now(),
      user: profile.username || "visitor",
      avatar: profile.avatar,
      text: text,
      time: "방금",
      likes: 0,
      isLiked: false
    };

    try {
      const updatedPost = {
        ...postToUpdate,
        comments: [...(postToUpdate.comments || []), newComment]
      };
      await setDoc(doc(db, "posts", postId.toString()), updatedPost);
      if (selectedPost?.id === postId) setSelectedPost(updatedPost);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `posts/${postId}`);
    }
  };

  const handleUpdateComment = async (postId: number, commentId: number, text: string, time: string, likes: number) => {
    const postToUpdate = posts.find(p => p.id === postId);
    if (!postToUpdate) return;

    try {
      const updatedPost = {
        ...postToUpdate,
        comments: (postToUpdate.comments || []).map(c => 
          c.id === commentId ? { ...c, text, time, likes } : c
        )
      };
      await setDoc(doc(db, "posts", postId.toString()), updatedPost);
      if (selectedPost?.id === postId) setSelectedPost(updatedPost);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `posts/${postId}`);
    }
  };

  const handleDeleteComment = async (postId: number, commentId: number) => {
    const postToUpdate = posts.find(p => p.id === postId);
    if (!postToUpdate) return;

    try {
      const updatedPost = {
        ...postToUpdate,
        comments: (postToUpdate.comments || []).filter(c => c.id !== commentId),
        commentsCount: Math.max(0, (postToUpdate.commentsCount || 0) - 1)
      };
      await setDoc(doc(db, "posts", postId.toString()), updatedPost);
      if (selectedPost?.id === postId) setSelectedPost(updatedPost);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `posts/${postId}`);
    }
  };

  const handleUpdateCaption = async (postId: number, text: string, time: string, likes: number, commentsCount: number) => {
    const postToUpdate = posts.find(p => p.id === postId);
    if (!postToUpdate) return;

    try {
      const updatedPost = { ...postToUpdate, caption: text, time, likes, commentsCount };
      await setDoc(doc(db, "posts", postId.toString()), updatedPost);
      if (selectedPost?.id === postId) setSelectedPost(updatedPost);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `posts/${postId}`);
    }
  };

  const handleFollowChange = async (isFollowing: boolean) => {
    // Only persist if admin, otherwise we just use the local state overlay.
    if (!isAdmin) return;
    try {
      const delta = isFollowing ? 1 : -1;
      const nextCount = updateFormattedCount(profile.followersCount, delta);
      const updatedProfile = { ...profile, followersCount: nextCount };
      await setDoc(doc(db, "profiles", "main"), updatedProfile);
    } catch (error) {
      console.error("Follow error:", error);
    }
  };

  // If showLockScreen is true, render the lock screen and hide the main app content
  if (showLockScreen) {
    return (
      <AnimatePresence>
        <LockScreen key="lock-screen" onUnlock={() => setShowLockScreen(false)} isReady={!isInitializing} />
      </AnimatePresence>
    );
  }

  // The main app is only rendered when lock screen is gone
  // We don't block render on isInitializing anymore since the lock screen protects it,
  // making the transition to the main app seamless once unlocked.
  return (
    <div className="bg-brand-bg text-brand-ink min-h-screen selection:bg-brand-accent/30 font-sans overflow-x-hidden">
      <AnimatePresence>
        {selectedPost && (
          <PostModal 
            key="modal"
            post={selectedPost} 
            profile={profile}
            isAdmin={isAdmin}
            onClose={() => setSelectedPost(null)}
            onEditComments={() => setShowEditModal("comments")}
            onAddComment={handleAddComment}
            onUpdateComment={handleUpdateComment}
            onDeleteComment={handleDeleteComment}
            onUpdateCaption={handleUpdateCaption}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDMOpen && (
          <DMOverlay 
            key="dm" 
            onClose={() => setIsDMOpen(false)} 
            chats={chats} 
            setChats={setChats} 
            isAdmin={isAdmin}
            profileUsername={profile.username}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditModal && (
          <EditModal 
            key="edit"
            type={showEditModal}
            data={
              showEditModal === "profile" 
                ? profile 
                : showEditModal === "posts" 
                  ? posts 
                  : showEditModal === "highlights"
                    ? highlights
                    : selectedPost?.comments || []
            }
            onSave={async (newData) => {
              if (showEditModal === "profile") {
                await handleSaveProfile(newData);
              } else if (showEditModal === "posts") {
                await handleSavePosts(newData);
              } else if (showEditModal === "highlights") {
                await handleSaveHighlights(newData);
              } else if (showEditModal === "comments" && selectedPost) {
                const updatedPost = { ...selectedPost, comments: newData };
                await setDoc(doc(db, "posts", selectedPost.id.toString()), updatedPost);
                setSelectedPost(updatedPost);
              }
              setShowEditModal(null);
            }}
            onClose={() => setShowEditModal(null)}
          />
        )}
      </AnimatePresence>

      {/* Top Mobile Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-12 bg-black/80 backdrop-blur-md border-b border-zinc-900 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <h1 className="font-bold tracking-tight text-sm">{profile.username}</h1>
          <ChevronLeft className="rotate-[-90deg] text-zinc-500" size={14} />
        </div>
        <div className="flex items-center gap-5">
           {isAdmin && <Settings size={22} onClick={() => setShowEditModal("profile")} />}
           <Heart size={22} />
           <Send size={22} onClick={() => setIsDMOpen(true)} />
        </div>
      </div>

      <main className="max-w-screen-xl mx-auto md:px-4">
         <ProfileHeader 
            profile={profile} 
            isAdmin={isAdmin}
            user={user}
            onMessageClick={() => setIsDMOpen(true)} 
            onEditProfile={() => setShowEditModal("profile")}
            onToggleEdit={() => setIsEditMode(prev => !prev)}
            onFollowChange={handleFollowChange}
          />
         <Highlights 
            highlights={highlights}
            isAdmin={isAdmin}
            onEdit={() => setShowEditModal("highlights")}
          />
         <PostGrid 
            posts={posts}
            isAdmin={isAdmin}
            onPostClick={(post) => setSelectedPost(post)} 
            onManagePosts={() => setShowEditModal("posts")}
          />
      </main>

      {/* Bottom Mobile Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-black border-t border-zinc-900 flex items-center justify-around px-4 z-50 pb-safe">
        <div className="hover:opacity-70 transition-opacity cursor-pointer">
          <Grid className="text-white" size={24} />
        </div>
        <div className="w-6 h-6 border-2 border-white/40 rounded-lg flex items-center justify-center cursor-pointer">
           <div className="w-4 h-4 bg-zinc-800 rounded-sm" />
        </div>
        <div className="w-6 h-6 rounded border border-white/40 flex items-center justify-center cursor-pointer text-white text-lg">+</div>
        <MessageCircle size={24} onClick={() => setIsDMOpen(true)} className="cursor-pointer" />
        <div className="w-7 h-7 rounded-full bg-zinc-800 overflow-hidden border border-white/30 cursor-pointer">
             <img src={profile.avatar || null} alt="me" referrerPolicy="no-referrer" />
        </div>
      </nav>

      {/* Desktop Footer */}
      <footer className="hidden md:block py-16 border-t border-zinc-900 mt-10">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-[10px] font-semibold text-brand-muted uppercase tracking-widest mb-10">
            {["Meta", "About", "Blog", "Jobs", "Help", "API", "Privacy", "Terms", "Locations", "Threads"].map(link => (
              <a key={link} href="#" className="hover:underline">{link}</a>
            ))}
          </div>
          <p className="text-center text-[10px] text-brand-muted uppercase tracking-[0.2em]">
            © 2026 {profile.name} FROM META
          </p>
        </div>
      </footer>
    </div>
  );
}
