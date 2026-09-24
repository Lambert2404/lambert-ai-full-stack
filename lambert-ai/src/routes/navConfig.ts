export interface NavItem {
  labelKey: 'dashboard' | 'tutor' | 'conversations' | 'subjects' | 'materials' | 'pastPapers' | 'quizzes' | 'studyPlanner' | 'progress' | 'recommendations' | 'bookmarks'
  path: string
  icon: string
}

export const studentNavItems: NavItem[] = [
  { labelKey: 'dashboard', path: '/dashboard', icon: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { labelKey: 'tutor', path: '/tutor', icon: 'M8 10h8M8 14h4m-8 6 2.5-3H18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h.5z' },
  { labelKey: 'conversations', path: '/conversations', icon: 'M4 4h16v11H7l-3 3z' },
  { labelKey: 'subjects', path: '/subjects', icon: 'M4 5h16M4 12h16M4 19h10' },
  { labelKey: 'materials', path: '/materials', icon: 'M6 2h9l5 5v15H6zM14 2v6h5' },
  { labelKey: 'pastPapers', path: '/past-papers', icon: 'M9 3h6l5 5v13H4V3h5zM9 12h6M9 16h6' },
  { labelKey: 'quizzes', path: '/quizzes', icon: 'M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.8 7.1 18.2 8 12.7l-4-3.9L9.5 8z' },
  { labelKey: 'studyPlanner', path: '/study-planner', icon: 'M4 5h16v16H4zM4 9h16M8 3v4M16 3v4' },
  { labelKey: 'progress', path: '/progress', icon: 'M4 20V10m6 10V4m6 16v-7' },
  { labelKey: 'recommendations', path: '/recommendations', icon: 'M12 2a6 6 0 0 0-4 10.5V16h8v-3.5A6 6 0 0 0 12 2zM9 19h6M10 22h4' },
  { labelKey: 'bookmarks', path: '/bookmarks', icon: 'M6 2h12v20l-6-4-6 4z' },
]
