// AI assisted development
import { useState, useEffect, useRef } from 'react';
import { Check, CreditCard, Zap, Crown, Star, Shield, Users, Mail, Headphones, TrendingUp, ArrowRight, Loader2, AlertCircle, RefreshCw, Lock } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { useAuth } from '../contexts/AuthContext';
import { fetchSubscriptionPlans, SubscriptionPlanResponse } from '../api/subscriptions';
import { toast } from 'sonner';

interface PricingPageProps {
  onNavigate: (page: string) => void;
}

const CACHE_KEY = 'medexjob_pricing_plans';
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes session cache

interface CachedPlans {
  plans: SubscriptionPlanResponse[];
  timestamp: number;
  expiresAt: number;
}

function getCachedPlans(): SubscriptionPlanResponse[] | null {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const parsed: CachedPlans = JSON.parse(cached);
    const now = Date.now();
    if (now >= parsed.expiresAt || now - parsed.timestamp > CACHE_DURATION_MS) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsed.plans;
  } catch {
    return null;
  }
}

function setCachedPlans(plans: SubscriptionPlanResponse[]): void {
  try {
    const now = Date.now();
    const data: CachedPlans = {
      plans,
      timestamp: now,
      expiresAt: now + CACHE_DURATION_MS
    };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

export function PricingPage({ onNavigate }: PricingPageProps) {
  const { isAuthenticated, user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlanResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    document.title = 'Employer Pricing Plans | MedExJob';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Subscription plans for hospitals and employers to post jobs on MedExJob.com');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Subscription plans for hospitals and employers to post jobs on MedExJob.com';
      document.head.appendChild(meta);
    }
  }, []);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const loadPlans = async () => {
      const cached = getCachedPlans();
      if (cached && cached.length > 0) {
        setPlans(cached);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const fetchedPlans = await fetchSubscriptionPlans();
        setPlans(fetchedPlans);
        setCachedPlans(fetchedPlans);
      } catch (err: any) {
        console.error('Error fetching pricing plans:', err);
        setError(err.message || 'Failed to load pricing plans. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, []);

  const handleRetry = async () => {
    fetchedRef.current = false;
    sessionStorage.removeItem(CACHE_KEY);
    setLoading(true);
    setError(null);
    try {
      const fetchedPlans = await fetchSubscriptionPlans();
      setPlans(fetchedPlans);
      setCachedPlans(fetchedPlans);
    } catch (err: any) {
      setError(err.message || 'Failed to load pricing plans.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan: SubscriptionPlanResponse) => {
    if (!isAuthenticated || !user) {
      onNavigate('register');
      return;
    }

    const role = user.role;

    if (role === 'admin') {
      return;
    }

    if (role === 'candidate') {
      toast.warning('These plans are for employers. Please register as an employer to purchase a subscription.');
      return;
    }

    if (role === 'employer') {
      onNavigate('subscription');
      return;
    }

    onNavigate('register');
  };

  const isAdminUser = isAuthenticated && user?.role === 'admin';

  const isPopularPlan = (plan: SubscriptionPlanResponse, index: number): boolean => {
    if ((plan as any).popular === true) return true;
    if (plan.displayOrder === 1) return true;
    if (index === 1 && plans.length >= 2) return true;
    return false;
  };

  const getPlanIcon = (index: number) => {
    const icons = [
      <CreditCard className="w-8 h-8" key="credit" />,
      <Zap className="w-8 h-8" key="zap" />,
      <Crown className="w-8 h-8" key="crown" />
    ];
    return icons[index] || <Star className="w-8 h-8" />;
  };

  const getPlanConfig = (index: number, isPopular: boolean) => {
    const configs = [
      {
        borderColor: 'border-blue-200',
        hoverBorderColor: 'hover:border-blue-400',
        iconGradient: 'from-blue-500 to-blue-600',
        badgeBg: 'bg-blue-100',
        badgeText: 'text-blue-700',
        badgeBorder: 'border-blue-200',
        priceColor: 'text-blue-600',
        postsBg: 'from-blue-50 to-blue-100',
        postsBorder: 'border-blue-200'
      },
      {
        borderColor: 'border-green-300',
        hoverBorderColor: 'hover:border-green-500',
        iconGradient: 'from-green-500 to-emerald-600',
        badgeBg: 'bg-green-100',
        badgeText: 'text-green-700',
        badgeBorder: 'border-green-200',
        priceColor: 'text-green-600',
        postsBg: 'from-green-50 to-emerald-100',
        postsBorder: 'border-green-200'
      },
      {
        borderColor: 'border-purple-200',
        hoverBorderColor: 'hover:border-purple-400',
        iconGradient: 'from-purple-500 to-pink-600',
        badgeBg: 'bg-purple-100',
        badgeText: 'text-purple-700',
        badgeBorder: 'border-purple-200',
        priceColor: 'text-purple-600',
        postsBg: 'from-purple-50 to-pink-100',
        postsBorder: 'border-purple-200'
      }
    ];
    return configs[index] || configs[0];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        {/* Header */}
        <header className="text-center mb-12 sm:mb-16 lg:mb-20">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
            Employer &amp; Hospital Plans
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed px-4">
            Choose the perfect subscription plan for your hiring needs. Post medical jobs and connect with verified healthcare professionals.
          </p>
        </header>

        {/* Error State */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between gap-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleRetry} className="flex items-center gap-1">
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-3 text-gray-600">Loading pricing plans...</span>
          </div>
        )}

        {/* Plans Grid */}
        {!loading && !error && (
          <section className="mb-12 sm:mb-16 lg:mb-20">
            {plans.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-lg lg:max-w-6xl mx-auto">
                {plans.map((plan, index) => {
                  const popular = isPopularPlan(plan, index);
                  const config = getPlanConfig(index, popular);

                  return (
                    <article
                      key={plan.id}
                      className={`relative bg-white rounded-xl border-2 transition-all duration-300 flex flex-col ${config.borderColor} ${config.hoverBorderColor} ${
                        popular
                          ? 'ring-2 ring-green-200 shadow-lg lg:scale-105'
                          : 'shadow-sm hover:shadow-md hover:-translate-y-0.5'
                      }`}
                    >
                      {/* Popular Badge */}
                      {popular && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                          <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1 text-xs font-semibold shadow-md rounded-full">
                            Most Popular
                          </Badge>
                        </div>
                      )}

                      <div className="p-6 sm:p-8 pt-10 flex flex-col h-full">
                        {/* Icon */}
                        <div className="flex items-center justify-center mb-5">
                          <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br ${config.iconGradient}`}>
                            <div className="text-white">{getPlanIcon(index)}</div>
                          </div>
                        </div>

                        {/* Plan Name */}
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 text-center">
                          {plan.name}
                        </h2>

                        {/* Price */}
                        <div className="text-center mb-6">
                          {plan.hasDiscount && plan.basePrice && plan.basePrice > plan.price ? (
                            <div className="space-y-1">
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-lg text-gray-400 line-through">
                                  ₹{plan.basePrice.toLocaleString()}
                                </span>
                                <Badge className="bg-red-100 text-red-700 border-red-300 text-xs font-bold px-2 py-0.5">
                                  {plan.discountType === 'PERCENTAGE'
                                    ? `${plan.discountValue}% OFF`
                                    : `₹${plan.discountValue?.toLocaleString()} OFF`}
                                </Badge>
                              </div>
                              <div className="flex items-baseline justify-center gap-1">
                                <span className={`text-3xl sm:text-4xl font-extrabold ${config.priceColor}`}>
                                  ₹{plan.price.toLocaleString()}
                                </span>
                                <span className="text-sm text-gray-500">/{plan.duration}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-baseline justify-center gap-1">
                              <span className={`text-3xl sm:text-4xl font-extrabold ${config.priceColor}`}>
                                ₹{plan.price.toLocaleString()}
                              </span>
                              <span className="text-sm text-gray-500">/{plan.duration}</span>
                            </div>
                          )}
                        </div>

                        {/* Features */}
                        <ul className="space-y-3 mb-6 flex-grow">
                          {plan.features.map((feature, fIndex) => (
                            <li key={fIndex} className="flex items-start gap-3">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${config.badgeBg}`}>
                                <Check className={`w-3.5 h-3.5 ${config.badgeText}`} />
                              </div>
                              <span className="text-gray-700 text-sm">{feature}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Job Posts */}
                        <div className={`rounded-xl p-4 mb-6 bg-gradient-to-br ${config.postsBg} border ${config.postsBorder}`}>
                          <div className="text-center">
                            <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                              Job Posts Included
                            </p>
                            <p className={`text-3xl font-extrabold ${config.priceColor}`}>
                              {plan.jobPostsAllowed}
                            </p>
                          </div>
                        </div>

                        {/* CTA */}
                        <Button
                          className="w-full py-3 text-sm font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
                          onClick={() => handleSelectPlan(plan)}
                          disabled={isAdminUser}
                          title={isAdminUser ? 'Admins cannot purchase plans' : undefined}
                        >
                          {isAdminUser ? 'Admin View Only' : 'Get Started'}
                          {!isAdminUser && <ArrowRight className="w-4 h-4" />}
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <Card className="p-12 text-center max-w-md mx-auto">
                <p className="text-gray-500">No pricing plans available at the moment.</p>
              </Card>
            )}

            {/* Payment Trust Indicator */}
            {plans.length > 0 && (
              <div
                className="mt-8 text-center"
                aria-label="Secure payment information"
              >
                <p className="inline-flex items-center gap-2 text-sm text-gray-500">
                  <Lock className="w-4 h-4" />
                  Secure payments processed via Razorpay. All transactions are encrypted and protected.
                </p>
              </div>
            )}
          </section>
        )}

        {/* Features Section */}
        {!loading && !error && plans.length > 0 && (
          <section className="max-w-4xl mx-auto">
            <Card className="p-6 sm:p-8 bg-white border-2 border-gray-200 rounded-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">What's Included in All Plans</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: Users, text: 'Access to verified medical professionals' },
                  { icon: TrendingUp, text: 'Application management dashboard' },
                  { icon: Mail, text: 'Email notifications for applications' },
                  { icon: Headphones, text: '24/7 customer support' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-700 text-sm">{item.text}</span>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}
