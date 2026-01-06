import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

interface Announcement {
    id: string;
    title: string;
    content: string;
    type: 'info' | 'warning' | 'success' | 'error';
}

export const AnnouncementBanner = () => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const fetchActiveAnnouncements = async () => {
            try {
                const { data, error } = await supabase
                    .from('announcements')
                    .select('id, title, content, type')
                    .eq('is_active', true)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                if (data && data.length > 0) {
                    setAnnouncements(data);
                    setIsVisible(true);
                }
            } catch (error) {
                console.error('Error fetching announcements:', error);
            }
        };

        fetchActiveAnnouncements();
    }, []);

    const handleDismiss = () => {
        if (announcements.length > 1 && currentIndex < announcements.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setIsVisible(false);
        }
    };

    if (!isVisible || announcements.length === 0) return null;

    const current = announcements[currentIndex];

    const getStyles = (type: string) => {
        switch (type) {
            case 'success':
                return {
                    container: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
                    icon: <CheckCircle className="size-5 text-green-600 dark:text-green-400" />,
                    title: 'text-green-800 dark:text-green-300',
                    content: 'text-green-700 dark:text-green-400',
                };
            case 'warning':
                return {
                    container: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
                    icon: <AlertTriangle className="size-5 text-yellow-600 dark:text-yellow-400" />,
                    title: 'text-yellow-800 dark:text-yellow-300',
                    content: 'text-yellow-700 dark:text-yellow-400',
                };
            case 'error':
                return {
                    container: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
                    icon: <AlertCircle className="size-5 text-red-600 dark:text-red-400" />,
                    title: 'text-red-800 dark:text-red-300',
                    content: 'text-red-700 dark:text-red-400',
                };
            default:
                return {
                    container: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
                    icon: <Info className="size-5 text-blue-600 dark:text-blue-400" />,
                    title: 'text-blue-800 dark:text-blue-300',
                    content: 'text-blue-700 dark:text-blue-400',
                };
        }
    };

    const styles = getStyles(current.type);

    return (
        <div className={`mb-0 p-4 rounded-2xl border ${styles.container} transition-all animate-in fade-in slide-in-from-top-4 duration-500`}>
            <div className="flex items-start gap-4">
                <div className="mt-0.5">{styles.icon}</div>
                <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-bold ${styles.title}`}>{current.title}</h4>
                    <p className={`text-sm mt-1 leading-relaxed ${styles.content}`}>{current.content}</p>
                </div>
                <button
                    onClick={handleDismiss}
                    className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors flex-shrink-0"
                >
                    <X className="size-4 text-text-secondary" />
                </button>
            </div>
            {announcements.length > 1 && (
                <div className="mt-3 flex gap-1 justify-center">
                    {announcements.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-1 rounded-full transition-all ${idx === currentIndex ? 'w-4 bg-primary' : 'w-1 bg-primary/30'
                                }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
