// AI assisted development
import { Check, CreditCard, Star, Zap, Crown, Shield, TrendingUp, Users, Mail, Headphones, ArrowRight, Sparkles, Gift, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchSubscriptionPlans,
  initiatePayment,
  getCurrentSubscription,
  SubscriptionPlanResponse,
  SubscriptionResponse,
  confirmRazorpayPayment
} from '../api/subscriptions';
import { SubscriptionPlan } from '../types';
import { useState, useEffect } from 'react';

interface SubscriptionPageProps {
  onNavigate: (page: string) => void;
}

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: "Can I upgrade or downgrade my plan?",
    answer: "Yes, you can change your plan at any time. Upgrades take effect immediately, while downgrades take effect at the next billing cycle."
  },
  {
    question: "What happens if I exceed my job posting limit?",
    answer: "You can purchase additional job posts at ₹999 each, or upgrade to a higher plan for better value."
  },
  {
    question: "Is there a free trial available?",
    answer: "Yes, new employers get a 7-day free trial with the Monthly Plan to test our platform."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards, debit cards, UPI, and net banking through our secure Razorpay payment gateway."
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer: "Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period."
  }
];

export function SubscriptionPage({ onNavigate }: SubscriptionPageProps) {
  const { token, user } = useAuth();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlanResponse[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

  // Fetch subscription plans
  useEffect(() => {
    const loadPlans = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedPlans = await fetchSubscriptionPlans();
        setPlans(fetchedPlans);

        // Fetch current subscription if user is logged in
        if (token) {
          try {
            const subscription = await getCurrentSubscription(token);
            setCurrentSubscription(subscription);
          } catch (err: any) {
            // Subscription fetch failed - handle different error cases
            if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
              // Token expired or invalid - user needs to login again
              console.warn('Authentication failed. User may need to login again.');
              // Don't show error to user if they're just browsing plans
              // Only show error if they try to subscribe
            } else {
              console.error('Error fetching current subscription:', err);
            }
            // Continue without subscription - user can still view plans
            setCurrentSubscription(null);
          }
        }
      } catch (err: any) {
        console.error('Error fetching subscription plans:', err);
        setError(err.message || 'Failed to load subscription plans. Please try again.');
        setPlans([]);
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, [token]);

  const handleSelectPlan = async (plan: SubscriptionPlanResponse) => {
    if (!token) {
      alert('Please login to subscribe to a plan.');
      onNavigate('login');
      return;
    }

    // Check if user already has active subscription
    if (currentSubscription && currentSubscription.status === 'active') {
      const confirmUpgrade = confirm(
        `You already have an active subscription (${currentSubscription.plan.name}). ` +
        `Do you want to upgrade to ${plan.name}?`
      );
      if (!confirmUpgrade) {
        return;
      }
    }

    try {
      setProcessingPayment(plan.id);
      setError(null);

      // Verify user is authenticated before proceeding
      if (!user || !token) {
        setError('Please login to purchase a subscription.');
        onNavigate('login');
        setProcessingPayment(null);
        return;
      }

      // Initiate payment (this will also validate token)
      let paymentData;
      try {
        paymentData = await initiatePayment(plan.id, token);
      } catch (paymentErr: any) {
        if (paymentErr.message?.includes('401') || paymentErr.message?.includes('Unauthorized')) {
          setError('Your session has expired. Please login again.');
          onNavigate('login');
          setProcessingPayment(null);
          return;
        }
        throw paymentErr; // Re-throw if it's not an auth error
      }
      
      // Check if Razorpay order was created
      if (paymentData.razorpayOrderId && paymentData.razorpayKeyId) {
        // Open Razorpay checkout
        const options = {
          key: paymentData.razorpayKeyId,
          amount: paymentData.razorpayAmount || (paymentData.amount * 100), // Amount in paise
          currency: paymentData.razorpayCurrency || 'INR',
          name: 'MedExJob.com',
          description: `Subscription: ${plan.name}`,
          order_id: paymentData.razorpayOrderId,
          handler: async (response: any) => {
            try {
              console.log('Payment successful, confirming on backend...', response);

              try {
                const confirmResult = await confirmRazorpayPayment(
                  {
                    paymentId: paymentData.paymentId,
                    razorpayOrderId: response.razorpay_order_id,
                    razorpayPaymentId: response.razorpay_payment_id,
                    razorpaySignature: response.razorpay_signature,
                  },
                  token
                );

                const activatedSubscription =
                  confirmResult.subscription || (await getCurrentSubscription(token));
                setCurrentSubscription(activatedSubscription);

                alert(
                  `Payment successful and verified!\n\n` +
                  `Plan: ${plan.name}\n` +
                  `Amount: ₹${plan.price.toLocaleString()}\n` +
                  `Payment ID: ${response.razorpay_payment_id}\n\n` +
                  `Subscription activated. Redirecting to dashboard...`
                );

                setTimeout(() => {
                  onNavigate('employer-post-job');
                }, 1000);
              } catch (confirmErr: any) {
                console.error('Payment confirmation error details:', confirmErr);
                const errorMessage =
                  confirmErr?.message || 'Payment could not be verified. Please contact support.';
                alert(
                  `Payment captured but verification failed.\n\n` +
                  `Error: ${errorMessage}\n\n` +
                  `Payment ID: ${response.razorpay_payment_id}\n` +
                  `Please contact support with this Payment ID.`
                );
                setError(errorMessage);
              }
            } catch (err: any) {
              console.error('Unexpected error in payment handler:', err);
              alert(
                `Payment successful but an error occurred.\n` +
                `Please contact support with Payment ID: ${response.razorpay_payment_id}`
              );
            } finally {
              setProcessingPayment(null);
            }
          },
          prefill: {
            name: user?.name || '',
            email: user?.email || '',
            contact: user?.phone || ''
          },
          theme: {
            color: '#2563eb'
          },
          modal: {
            ondismiss: () => {
              setProcessingPayment(null);
            }
          }
        };

        // Load Razorpay script if not already loaded
        const loadRazorpayScript = () => {
          return new Promise((resolve, reject) => {
            if ((window as any).Razorpay) {
              resolve((window as any).Razorpay);
              return;
            }
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve((window as any).Razorpay);
            script.onerror = () => reject(new Error('Failed to load Razorpay script'));
            document.body.appendChild(script);
          });
        };

        try {
          const Razorpay = await loadRazorpayScript();
          const razorpay = new Razorpay(options);
          razorpay.open();
        } catch (razorpayErr: any) {
          console.error('Error opening Razorpay checkout:', razorpayErr);
          setError('Failed to open payment gateway. Please try again.');
          setProcessingPayment(null);
        }
      } else {
        // Fallback when Razorpay order is not created
        console.error('Razorpay order was not created for this payment. Cannot continue.');
        setError('Unable to initiate payment with Razorpay. Please try again later or contact support.');
        setProcessingPayment(null);
      }
    } catch (err: any) {
      console.error('Error initiating payment:', err);
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        setError('Your session has expired. Please login again.');
        onNavigate('login');
      } else {
        setError(err.message || 'Failed to initiate payment. Please try again.');
      }
    } finally {
      setProcessingPayment(null);
    }
  };

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const getPlanIcon = (index: number) => {
    const icons = [<CreditCard className="w-8 h-8" />, <Zap className="w-8 h-8" />, <Crown className="w-8 h-8" />];
    return icons[index] || <Star className="w-8 h-8" />;
  };

  const getPlanConfig = (index: number) => {
    const configs = [
      {
        borderColor: 'border-blue-200',
        hoverBorderColor: 'hover:border-blue-400',
        iconBg: 'bg-blue-500',
        iconGradient: 'from-blue-500 to-blue-600',
        badgeBg: 'bg-blue-100',
        badgeText: 'text-blue-700',
        badgeBorder: 'border-blue-200',
        buttonGradient: 'from-blue-600 to-blue-700',
        buttonHover: 'hover:from-blue-700 hover:to-blue-800',
        priceColor: 'text-blue-600',
        postsBg: 'from-blue-50 to-blue-100',
        postsBorder: 'border-blue-200',
        isPopular: false
      },
      {
        borderColor: 'border-green-300',
        hoverBorderColor: 'hover:border-green-500',
        iconBg: 'bg-green-500',
        iconGradient: 'from-green-500 to-emerald-600',
        badgeBg: 'bg-green-100',
        badgeText: 'text-green-700',
        badgeBorder: 'border-green-200',
        buttonGradient: 'from-green-600 to-emerald-700',
        buttonHover: 'hover:from-green-700 hover:to-emerald-800',
        priceColor: 'text-green-600',
        postsBg: 'from-green-50 to-emerald-100',
        postsBorder: 'border-green-200',
        isPopular: true
      },
      {
        borderColor: 'border-purple-200',
        hoverBorderColor: 'hover:border-purple-400',
        iconBg: 'bg-purple-500',
        iconGradient: 'from-purple-500 to-pink-600',
        badgeBg: 'bg-purple-100',
        badgeText: 'text-purple-700',
        badgeBorder: 'border-purple-200',
        buttonGradient: 'from-purple-600 to-pink-700',
        buttonHover: 'hover:from-purple-700 hover:to-pink-800',
        priceColor: 'text-purple-600',
        postsBg: 'from-purple-50 to-pink-100',
        postsBorder: 'border-purple-200',
        isPopular: false
      }
    ];
    return configs[index] || {
      borderColor: 'border-gray-200',
      hoverBorderColor: 'hover:border-gray-300',
      iconBg: 'bg-gray-500',
      iconGradient: 'from-gray-500 to-gray-600',
      badgeBg: 'bg-gray-100',
      badgeText: 'text-gray-700',
      badgeBorder: 'border-gray-200',
      buttonGradient: 'from-gray-600 to-gray-700',
      buttonHover: 'hover:from-gray-700 hover:to-gray-800',
      priceColor: 'text-gray-600',
      postsBg: 'from-gray-50 to-gray-100',
      postsBorder: 'border-gray-200',
      isPopular: false
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        {/* Header Section */}
        <header className="text-center mb-12 sm:mb-16 lg:mb-20">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
            Choose Your Plan
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed px-4">
            Select the perfect subscription plan for your hiring needs. All plans include verified candidate access and comprehensive analytics.
          </p>
        </header>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setError(null)}
              className="ml-auto"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* VIP Testing Account Notice */}
        {user?.email?.toLowerCase() === 'cricketloverayush9999@gmail.com' && (
          <div className="mb-8 p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-300 rounded-xl shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 mb-2">
                  <Sparkles className="w-3.5 h-3.5" /> VIP Test Account (Subscription Waived)
                </span>
                <p className="font-bold text-gray-900 text-base">You do not need to buy a subscription for this account.</p>
                <p className="text-sm text-gray-600 mt-0.5">
                  Job postings are fully unlocked and free for this account for platform testing purposes.
                </p>
              </div>
              <Button
                onClick={() => onNavigate('employer-post-job')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md whitespace-nowrap"
              >
                Post a Job Now
              </Button>
            </div>
          </div>
        )}

        {/* Current Subscription Info */}
        {currentSubscription && currentSubscription.status === 'active' && user?.email?.toLowerCase() !== 'cricketloverayush9999@gmail.com' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-green-900">Active Subscription: {currentSubscription.plan.name}</p>
                <p className="text-sm text-green-700">
                  Valid until: {new Date(currentSubscription.endDate).toLocaleDateString('en-IN')} • 
                  Posts used: {currentSubscription.jobPostsUsed} / {currentSubscription.jobPostsAllowed}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Cards Section */}
        <section className="mb-12 sm:mb-16 lg:mb-20">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-3 text-gray-600">Loading subscription plans...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 lg:gap-5 w-full px-2 sm:px-4 lg:px-6">
              {plans.length > 0 ? (
                plans.map((plan, index) => {
              const config = getPlanConfig(index);
              const isPopular = config.isPopular || false;
              
              return (
                <article
                  key={plan.id}
                  className={`relative bg-white rounded-xl border-2 transition-all duration-300 flex flex-col ${
                    config.borderColor
                  } ${config.hoverBorderColor} ${
                    isPopular 
                      ? 'ring-2 ring-green-100 shadow-lg lg:scale-105' 
                      : 'shadow-sm hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  {/* Popular Badge */}
                  {isPopular && (
                    <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-2.5 py-0.5 text-xs font-semibold shadow-md flex items-center gap-1 rounded-full">
                        <Gift className="w-3 h-3" />
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  {/* Premium Badge */}
                  {index === plans.length - 1 && plans.length > 2 && (
                    <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-2.5 py-0.5 text-xs font-semibold shadow-md flex items-center gap-1 rounded-full">
                        <Crown className="w-3 h-3" />
                        Premium
                      </Badge>
                    </div>
                  )}

                  <div className="p-5 sm:p-6 lg:p-6 pt-9 sm:pt-10 lg:pt-11 flex flex-col h-full">
                    {/* Plan Header */}
                    <div className="text-center mb-6">
                      {/* Icon */}
                      <div className="flex items-center justify-center mb-5">
                        <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-110 bg-gradient-to-br ${config.iconGradient}`}>
                          <div className="text-white flex items-center justify-center">
                            {getPlanIcon(index)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Plan Name */}
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 leading-tight">
                        {plan.name}
                      </h2>
                      
                      {/* Badge - Always reserve space for consistency */}
                      <div className="h-6 mb-4 flex items-center justify-center">
                        {!isPopular && (
                          <Badge className={`${config.badgeBg} ${config.badgeText} ${config.badgeBorder} border text-xs px-3 py-1`}>
                            {index === 0 ? 'Basic' : 'Premium'}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Price */}
                      <div className="mt-4">
                        {plan.hasDiscount && plan.basePrice && plan.basePrice > plan.price ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-lg sm:text-xl text-gray-400 line-through font-semibold">
                                ₹{plan.basePrice.toLocaleString()}
                              </span>
                              <Badge className="bg-red-100 text-red-700 border-red-300 text-xs font-bold px-2 py-0.5">
                                {plan.discountType === 'PERCENTAGE' 
                                  ? `${plan.discountValue}% OFF`
                                  : `₹${plan.discountValue?.toLocaleString()} OFF`}
                              </Badge>
                            </div>
                            <div className="flex items-baseline justify-center gap-1.5">
                              <span className={`text-3xl sm:text-4xl font-extrabold ${config.priceColor} leading-none`}>
                                ₹{plan.price.toLocaleString()}
                              </span>
                              <span className="text-sm text-gray-500 font-medium leading-none">
                                /{plan.duration}
                              </span>
                            </div>
                            <p className="text-xs text-green-600 font-semibold text-center">
                              Save ₹{(plan.basePrice - plan.price).toLocaleString()}
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-baseline justify-center gap-1.5">
                            <span className={`text-3xl sm:text-4xl font-extrabold ${config.priceColor} leading-none`}>
                              ₹{plan.price.toLocaleString()}
                            </span>
                            <span className="text-sm text-gray-500 font-medium leading-none">
                              /{plan.duration}
                            </span>
                          </div>
                        )}
                        {index === plans.length - 1 && plan.duration === 'yearly' && (
                          <p className="text-xs text-gray-500 mt-2 font-medium text-center">
                            Best Value
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Features List */}
                    <ul className="space-y-3 mb-6 flex-grow min-h-[180px]">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start gap-3">
                          <div className="mt-0.5 flex-shrink-0">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            index === 0 ? 'bg-blue-100' :
                            index === 1 ? 'bg-green-100' :
                            'bg-purple-100'
                          }`}>
                            <Check className={`w-3.5 h-3.5 ${
                              index === 0 ? 'text-blue-600' :
                              index === 1 ? 'text-green-600' :
                              'text-purple-600'
                            }`} />
                            </div>
                          </div>
                          <span className="text-gray-700 font-medium leading-relaxed text-sm flex-1">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* Job Posts Info */}
                    <div className={`rounded-xl p-4 mb-6 transition-all duration-300 bg-gradient-to-br ${config.postsBg} border ${config.postsBorder}`}>
                      <div className="text-center">
                        <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                          Job Posts Included
                        </p>
                        <p className={`text-4xl font-extrabold mb-1 ${config.priceColor} leading-none`}>
                          {plan.jobPostsAllowed}
                        </p>
                        <p className="text-xs font-medium text-gray-600">
                          {plan.jobPostsAllowed === 1 ? 'Single post' : 
                           plan.jobPostsAllowed === 10 ? 'Per month' : 'Per year'}
                        </p>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <Button
                      className={`w-full py-3.5 text-sm font-semibold transition-all duration-300 shadow-md hover:shadow-lg rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white mt-auto flex items-center justify-center gap-1.5`}
                      onClick={() => handleSelectPlan(plan)}
                      disabled={processingPayment === plan.id}
                    >
                      {processingPayment === plan.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <span>Choose {plan.name}</span>
                          <ArrowRight className="w-4 h-4 flex-shrink-0" />
                        </>
                      )}
                    </Button>
                  </div>
                </article>
              );
            })) : (
              <Card className="p-12 text-center col-span-full">
                <p className="text-gray-500">No subscription plans available at the moment.</p>
              </Card>
            )}
            </div>
          )}
        </section>

        {/* Additional Info Section */}
        <section className="w-full mb-10 sm:mb-12 lg:mb-16 px-2 sm:px-4 lg:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 lg:gap-6 max-w-6xl mx-auto">
            {/* What's Included */}
            <Card className="p-4 sm:p-5 lg:p-6 bg-white border-2 border-gray-200 hover:border-blue-300 transition-all duration-300 rounded-xl shadow-sm hover:shadow-md">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  What's Included in All Plans
                </h3>
              </div>
              <ul className="space-y-2.5">
                {[
                  { icon: Users, text: 'Access to verified medical professionals' },
                  { icon: TrendingUp, text: 'Basic application management' },
                  { icon: Mail, text: 'Email notifications for new applications' },
                  { icon: Headphones, text: '24/7 customer support' }
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-blue-50 transition-colors">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-700 font-medium text-xs sm:text-sm">
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Payment & Billing */}
            <Card className="p-4 sm:p-5 lg:p-6 bg-white border-2 border-gray-200 hover:border-green-300 transition-all duration-300 rounded-xl shadow-sm hover:shadow-md">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  Payment & Billing
                </h3>
              </div>
              <ul className="space-y-2.5">
                {[
                  { icon: Shield, text: 'Secure payment via Razorpay', color: 'blue' },
                  { icon: Check, text: 'Instant activation after payment', color: 'green' },
                  { icon: Check, text: 'Auto-renewal available', color: 'green' },
                  { icon: Check, text: 'Cancel anytime', color: 'green' }
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-green-50 transition-colors">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      item.color === 'blue' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      <item.icon className={`w-4 h-4 ${
                        item.color === 'blue' ? 'text-blue-600' : 'text-green-600'
                      }`} />
                    </div>
                    <span className="text-gray-700 font-medium text-xs sm:text-sm">
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </section>

        {/* Comparison Table Section */}
        <section className="w-full mb-10 sm:mb-12 lg:mb-16 px-2 sm:px-4 lg:px-6">
          <header className="text-center mb-5 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              Compare Plans
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              See how our plans stack up against each other
            </p>
          </header>
          <Card className="p-4 sm:p-5 lg:p-6 overflow-hidden rounded-xl border-2 border-gray-200 shadow-sm max-w-6xl mx-auto">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left p-3 font-semibold text-gray-900 text-xs sm:text-sm">
                      Features
                    </th>
                    {plans.map((plan) => (
                      <th key={plan.id} className="text-center p-3 font-semibold text-gray-900 text-xs sm:text-sm">
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-medium text-gray-700 text-xs sm:text-sm">Job Posts</td>
                    {plans.map((plan) => (
                      <td key={plan.id} className="text-center p-3">
                        <span className="font-semibold text-gray-900 text-xs sm:text-sm">
                          {plan.jobPostsAllowed}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-medium text-gray-700 text-xs sm:text-sm">Price</td>
                    {plans.map((plan) => (
                      <td key={plan.id} className="text-center p-3">
                        <span className="font-semibold text-gray-900 text-xs sm:text-sm">
                          ₹{plan.price.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">
                          /{plan.duration}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-medium text-gray-700 text-xs sm:text-sm">Priority Approval</td>
                    {plans.map((plan, index) => (
                      <td key={plan.id} className="text-center p-3">
                        {index === 0 ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <Check className="w-4 h-4 text-green-500 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-medium text-gray-700 text-xs sm:text-sm">Advanced Analytics</td>
                    {plans.map((plan, index) => (
                      <td key={plan.id} className="text-center p-3">
                        {index === 0 ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <Check className="w-4 h-4 text-green-500 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-medium text-gray-700 text-xs sm:text-sm">Featured Jobs</td>
                    {plans.map((plan, index) => (
                      <td key={plan.id} className="text-center p-3">
                        {index === plans.length - 1 ? (
                          <Check className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-medium text-gray-700 text-xs sm:text-sm">Dedicated Support</td>
                    {plans.map((plan, index) => (
                      <td key={plan.id} className="text-center p-3">
                        {index === plans.length - 1 ? (
                          <Check className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        {/* Trust Section */}
        <section className="w-full mb-10 sm:mb-12 lg:mb-16 px-2 sm:px-4 lg:px-6">
          <Card className="p-5 sm:p-6 lg:p-8 bg-gradient-to-br from-blue-50 via-white to-purple-50 border-2 border-blue-200 rounded-xl shadow-sm max-w-6xl mx-auto">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl mb-4 shadow-md">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
                Trusted by 500+ Medical Employers
              </h2>
              <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto mb-6 sm:mb-8">
                Join leading hospitals, clinics, and healthcare organizations who trust MedExJob.com for their hiring needs.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-6">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1.5">
                    500+
                  </div>
                  <div className="text-gray-600 font-medium text-xs sm:text-sm">
                    Active Employers
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1.5">
                    10K+
                  </div>
                  <div className="text-gray-600 font-medium text-xs sm:text-sm">
                    Job Postings
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-1.5">
                    50K+
                  </div>
                  <div className="text-gray-600 font-medium text-xs sm:text-sm">
                    Medical Professionals
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* FAQ Section */}
        <section className="w-full px-2 sm:px-4 lg:px-6">
          <header className="text-center mb-5 sm:mb-6 max-w-5xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              Frequently Asked Questions
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              Everything you need to know about our subscription plans
            </p>
          </header>
          <div className="space-y-3 sm:space-y-4 max-w-5xl mx-auto">
            {faqItems.map((faq, index) => (
              <Card
                key={index}
                className={`p-4 sm:p-5 cursor-pointer transition-all duration-300 rounded-xl border-2 ${
                  expandedFaq === index
                    ? 'border-blue-300 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
                }`}
                onClick={() => toggleFaq(index)}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 pr-3 flex-1">
                    {faq.question}
                  </h3>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-300 ${
                      expandedFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </div>
                {expandedFaq === index && (
                  <p className="text-gray-600 mt-3 leading-relaxed text-xs sm:text-sm animate-in slide-in-from-top-2">
                    {faq.answer}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
