import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Review } from '../../types';
import { Star, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '../../lib/utils';

const ReviewsPage: React.FC = () => {
    const { user } = useAuth();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchReviews = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        const { data: restaurantData } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).single();
        if (restaurantData) {
            const { data, error } = await supabase.from('reviews').select('*').eq('restaurant_id', restaurantData.id).order('created_at', { ascending: false });
            if (data) setReviews(data);
            if (error) console.error("Error fetching reviews:", error);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);
    
    const handleVisibilityToggle = async (reviewId: string, currentVisibility: boolean) => {
        const { error } = await supabase.from('reviews').update({ is_visible: !currentVisibility }).eq('id', reviewId);
        if (!error) {
            setReviews(prevReviews => prevReviews.map(r => r.id === reviewId ? { ...r, is_visible: !currentVisibility } : r));
        } else {
            console.error("Error updating review visibility", error);
        }
    };

    if (loading) return <div>Loading reviews...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white">Customer Reviews</h1>
                    <p className="text-slate-400">Manage which reviews are visible on your public website.</p>
                </div>
            </div>
            {reviews.length > 0 ? (
                <div className="space-y-4">
                    {reviews.map((review) => (
                        <div key={review.id} className={cn("bg-slate-800/50 p-6 rounded-lg border border-slate-700 transition-opacity", !review.is_visible && "opacity-50")}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-white">{review.customer_name}</p>
                                    <p className="text-xs text-slate-500">{new Date(review.created_at).toLocaleString()}</p>
                                    <div className="flex gap-1 mt-1">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={16} className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'} />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={cn("text-sm", review.is_visible ? "text-slate-300" : "text-slate-500")}>
                                        {review.is_visible ? 'Visible' : 'Hidden'}
                                    </span>
                                    <button onClick={() => handleVisibilityToggle(review.id, review.is_visible)}>
                                        {review.is_visible ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-slate-500" />}
                                    </button>
                                </div>
                            </div>
                            <p className="text-slate-300 mt-4 italic">"{review.comment}"</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-lg">
                    <p className="text-slate-400">No customer reviews yet.</p>
                </div>
            )}
        </div>
    );
};

export default ReviewsPage;