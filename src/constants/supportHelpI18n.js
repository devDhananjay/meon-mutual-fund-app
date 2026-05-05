/**
 * Help, FAQ, Privacy, Terms — English / हिंदी (Groww-style in-app legal/help copy).
 */

export const SUPPORT_PHONE_DISPLAY = '+91 9990256258';
export const SUPPORT_PHONE_TEL = '+919990256258';
export const SUPPORT_EMAIL = 'support@meon.co.in';

export const SUPPORT_UI = {
  en: {
    heroFaq: 'How can we help you?',
    searchPlaceholder: 'Search questions, features, or topics…',
    quickSuggestions: 'Quick suggestions:',
    browseByCategory: 'Browse by category',
    categoryAll: 'All',
    sectionGeneral: 'General questions',
    viewAll: 'View all',
    callUs: 'Call us',
    emailUs: 'Email us',
    contactSub: 'We respond on business days as soon as we can.',
    helpIntro:
      "We're here to help—whether you're just getting started, need service info, or technical support.",
    titleLabel: 'Title',
    messageLabel: 'Message',
    titlePlaceholder: 'Enter title',
    messagePlaceholder: 'Enter message here…',
    submit: 'Submit',
    lastUpdated: 'Last updated on 23-02-2024',
    langEn: 'EN',
    langHi: 'HI',
  },
  hi: {
    heroFaq: 'हम आपकी कैसे मदद कर सकते हैं?',
    searchPlaceholder: 'प्रश्न, सुविधाएँ या विषय खोजें…',
    quickSuggestions: 'त्वरित सुझाव:',
    browseByCategory: 'श्रेणी के अनुसार ब्राउज़ करें',
    categoryAll: 'सभी',
    sectionGeneral: 'सामान्य प्रश्न',
    viewAll: 'सभी देखें',
    callUs: 'कॉल करें',
    emailUs: 'ईमेल करें',
    contactSub: 'कार्यदिवसों पर हम जल्द से जल्द जवाब देने का प्रयास करते हैं।',
    helpIntro:
      'चाहे आप शुरुआत कर रहे हों, सेवा जानकारी चाहिए, या तकनीकी सहायता—हम यहाँ हैं।',
    titleLabel: 'शीर्षक',
    messageLabel: 'संदेश',
    titlePlaceholder: 'शीर्षक दर्ज करें',
    messagePlaceholder: 'यहाँ संदेश लिखें…',
    submit: 'जमा करें',
    lastUpdated: 'अंतिम अपडेट: 23-02-2024',
    langEn: 'EN',
    langHi: 'HI',
  },
};

const ART = {
  faq: {
    title: {en: "FAQ's", hi: 'अक्सर पूछे जाने वाले प्रश्न'},
    sections: [
      {
        category: {en: 'General', hi: 'सामान्य'},
        heading: {en: 'What is Meon Mutual Funds?', hi: 'Meon Mutual Funds क्या है?'},
        body: {
          en: 'Meon Mutual Funds helps you discover schemes, start SIPs, place one-time investments, track orders, and manage mandates — in one place, with a clean, mobile-first experience.',
          hi: 'Meon Mutual Funds आपको योजनाएँ खोजने, SIP शुरू करने, एक बार का निवेश करने, ऑर्डर ट्रैक करने और मैंडेट प्रबंधित करने में मदद करता है — एक ही ऐप में, साफ मोबाइल अनुभव के साथ।',
        },
      },
      {
        category: {en: 'General', hi: 'सामान्य'},
        heading: {en: 'How do I start investing?', hi: 'निवेश कैसे शुरू करूँ?'},
        body: {
          en: 'Explore funds, open a fund detail, choose One-time or SIP, complete authentication when prompted, and confirm payment as per the selected mode. You can also add to cart and place orders from there.',
          hi: 'फंड एक्सप्लोर करें, फंड विवरण खोलें, वन-टाइम या SIP चुनें, संकेत मिलने पर प्रमाणीकरण पूरा करें और चुने गए मोड के अनुसार भुगतान की पुष्टि करें। कार्ट में जोड़कर भी ऑर्डर दे सकते हैं।',
        },
      },
      {
        category: {en: 'General', hi: 'सामान्य'},
        heading: {en: 'What is SIP?', hi: 'SIP क्या है?'},
        body: {
          en: 'A Systematic Investment Plan (SIP) lets you invest a fixed amount at regular intervals (e.g. monthly). It helps average purchase cost over time and build discipline.',
          hi: 'व्यवस्थित निवेश योजना (SIP) आपको नियमित अंतराल पर निश्चित राशि निवेश करने देती है (जैसे मासिक)। समय के साथ खरीद लागत औसत करने और अनुशासन बनाने में मदद मिलती है।',
        },
      },
      {
        category: {en: 'General', hi: 'सामान्य'},
        heading: {en: 'How are returns shown?', hi: 'रिटर्न कैसे दिखाए जाते हैं?'},
        body: {
          en: 'Returns shown in the app are indicative and based on data received from our sources. Past performance does not guarantee future results. Read scheme documents before investing.',
          hi: 'ऐप में दिखाए गए रिटर्न संकेतक हैं और स्रोतों से मिले डेटा पर आधारित हैं। पिछला प्रदर्शन भविष्य की गारंटी नहीं है। निवेश से पहले योजना दस्तावेज़ पढ़ें।',
        },
      },
      {
        category: {en: 'General', hi: 'सामान्य'},
        heading: {en: 'Where can I see my holdings?', hi: 'मेरी होल्डिंग्स कहाँ देखूँ?'},
        body: {
          en: 'Use the Dashboard for a portfolio snapshot and My Folios for folio-wise holdings. Pull to refresh to sync the latest data when available.',
          hi: 'पोर्टफोलियो सारांश के लिए डैशबोर्ड और फोलियो-वार होल्डिंग्स के लिए My Folios का उपयोग करें। नवीनतम डेटा के लिए खींचकर रिफ्रेश करें।',
        },
      },
      {
        category: {en: 'General', hi: 'सामान्य'},
        heading: {en: 'How do I redeem?', hi: 'रिडीम कैसे करूँ?'},
        body: {
          en: 'From eligible holdings, use Redeem and follow the flow. Timelines and amounts depend on scheme type, cut-off times, and AMC processes.',
          hi: 'योग्य होल्डिंग्स से रिडीम चुनें और प्रक्रिया पूरी करें। समय और राशि योजना प्रकार, कट-ऑफ समय और AMC प्रक्रिया पर निर्भर करती है।',
        },
      },
      {
        category: {en: 'General', hi: 'सामान्य'},
        heading: {en: 'Is KYC mandatory before investing?', hi: 'क्या निवेश से पहले KYC जरूरी है?'},
        body: {
          en: 'Yes. KYC compliance is required for most mutual fund transactions. If KYC is incomplete, your order may fail or stay pending until details are updated.',
          hi: 'हाँ। अधिकांश म्यूचुअल फंड लेनदेन के लिए KYC आवश्यक है। KYC अधूरा होने पर ऑर्डर असफल हो सकता है या विवरण अपडेट होने तक लंबित रह सकता है।',
        },
      },
      {
        category: {en: 'General', hi: 'सामान्य'},
        heading: {en: 'When is NAV applicable for my order?', hi: 'मेरे ऑर्डर पर कौन सा NAV लागू होगा?'},
        body: {
          en: 'Applicable NAV depends on scheme cut-off time, order type, and when the transaction is successfully processed. Payment/auth delays can shift NAV date.',
          hi: 'लागू NAV योजना के कट-ऑफ समय, ऑर्डर प्रकार और लेनदेन सफलतापूर्वक प्रोसेस होने के समय पर निर्भर करता है। भुगतान/ऑथ में देरी से NAV तिथि बदल सकती है।',
        },
      },
      {
        category: {en: 'General', hi: 'सामान्य'},
        heading: {en: 'Can I pause or cancel SIP?', hi: 'क्या मैं SIP रोक या रद्द कर सकता हूँ?'},
        body: {
          en: 'Yes, if your mandate and scheme rules allow it. You can go to order details / SIP records and use cancel actions where available.',
          hi: 'हाँ, यदि आपका मैंडेट और योजना नियम इसकी अनुमति दें। ऑर्डर विवरण / SIP रिकॉर्ड में जाकर उपलब्ध होने पर रद्द करने का विकल्प उपयोग कर सकते हैं।',
        },
      },
      {
        category: {en: 'General', hi: 'सामान्य'},
        heading: {en: 'What should I do if payment fails?', hi: 'भुगतान असफल होने पर क्या करें?'},
        body: {
          en: 'Check internet connectivity, bank/UPI status, and order status in My Orders. If amount is debited but order is not updated, contact support with transaction reference.',
          hi: 'इंटरनेट कनेक्शन, बैंक/UPI स्थिति और My Orders में ऑर्डर स्टेटस जांचें। राशि कटने पर भी ऑर्डर अपडेट न हो तो ट्रांज़ैक्शन रेफरेंस के साथ सपोर्ट से संपर्क करें।',
        },
      },
    ],
  },
  help: {
    title: {en: 'Help & Support', hi: 'सहायता और समर्थन'},
    sections: [
      {
        category: {en: 'Support', hi: 'सहायता'},
        heading: {en: 'Need help with an order?', hi: 'ऑर्डर में मदद चाहिए?'},
        body: {
          en: 'Open My Orders, select the order, and review the status timeline. If payment or authentication is pending, use the actions shown on that screen. Ensure network stability during payment.',
          hi: 'My Orders खोलें, ऑर्डर चुनें और स्टेटस टाइमलाइन देखें। भुगतान या प्रमाणीकरण लंबित हो तो स्क्रीन पर दिखाए गए विकल्प उपयोग करें। भुगतान के दौरान नेटवर्क स्थिर रखें।',
        },
      },
      {
        category: {en: 'Support', hi: 'सहायता'},
        heading: {en: 'Mandate issues', hi: 'मैंडेट से जुड़ी समस्याएँ'},
        body: {
          en: 'Check Mandates for status. If registration is pending, complete the bank/UPI flow when prompted. Failed mandates may need you to retry or add a new mandate.',
          hi: 'मैंडेट स्क्रीन पर स्थिति देखें। पंजीकरण लंबित हो तो बैंक/UPI फ्लो पूरा करें। असफल मैंडेट के लिए पुनः प्रयास या नया मैंडेट जोड़ना पड़ सकता है।',
        },
      },
      {
        category: {en: 'Support', hi: 'सहायता'},
        heading: {en: 'App or login problems', hi: 'ऐप या लॉगिन समस्या'},
        body: {
          en: 'Try updating the app, clearing background apps, and logging in again. If you suspect unauthorised access, change your password and contact support through official channels.',
          hi: 'ऐप अपडेट करें, बैकग्राउंड ऐप बंद करें और फिर लॉग इन करें। अनधिकृत पहुँच का संदेह हो तो पासवर्ड बदलें और आधिकारिक चैनलों से सपोर्ट से संपर्क करें।',
        },
      },
      {
        category: {en: 'Support', hi: 'सहायता'},
        heading: {en: 'Report incorrect data', hi: 'गलत डेटा रिपोर्ट करें'},
        body: {
          en: 'If balances or order status look wrong, note the order ID and time, pull to refresh, and reach out to support with screenshots. We will help verify with available records.',
          hi: 'बैलेंस या ऑर्डर स्टेटस गलत लगे तो ऑर्डर ID और समय नोट करें, रिफ्रेश करें और स्क्रीनशॉट के साथ सपोर्ट से संपर्क करें। हम उपलब्ध रिकॉर्ड से सत्यापन में मदद करेंगे।',
        },
      },
      {
        category: {en: 'Support', hi: 'सहायता'},
        heading: {en: 'Response time', hi: 'प्रतिक्रिया समय'},
        body: {
          en: 'We aim to respond to genuine queries as soon as possible on business days. Complex cases may need coordination with RTA/AMC and can take longer.',
          hi: 'हम कार्यदिवसों पर यथाशीघ्र जवाब देने का प्रयास करते हैं। जटिल मामलों में RTA/AMC समन्वय लग सकता है और समय अधिक लग सकता है।',
        },
      },
    ],
  },
  privacy: {
    title: {en: 'Privacy Policy', hi: 'गोपनीयता नीति'},
    sections: [
      {
        category: {en: 'Privacy', hi: 'गोपनीयता'},
        heading: {en: 'Information we use', hi: 'हम कौन सी जानकारी उपयोग करते हैं'},
        body: {
          en: 'We process information needed to run the app and services: account identifiers, session tokens where applicable, investment-related actions you initiate, and device/app diagnostics needed for stability and security.',
          hi: 'हम ऐप और सेवाओं के लिए आवश्यक जानकारी संसाधित करते हैं: खाता पहचान, सत्र टोकन (जहाँ लागू हो), आपके द्वारा शुरू किए गए निवेश संबंधी क्रियाएँ, और स्थिरता व सुरक्षा हेतु डिवाइस/ऐप डायग्नोस्टिक्स।',
        },
      },
      {
        category: {en: 'Privacy', hi: 'गोपनीयता'},
        heading: {en: 'How we use it', hi: 'हम इसका उपयोग कैसे करते हैं'},
        body: {
          en: 'Data is used to authenticate you, fulfil transactions you request, show portfolio and scheme information, improve reliability, detect fraud, and meet legal or regulatory obligations.',
          hi: 'डेटा का उपयोग प्रमाणीकरण, आपके अनुरोधित लेनदेन पूरा करने, पोर्टफोलियो व योजना जानकारी दिखाने, विश्वसनीयता सुधारने, धोखाधड़ी पहचानने और कानूनी/नियामक दायित्वों के लिए किया जाता है।',
        },
      },
      {
        category: {en: 'Privacy', hi: 'गोपनीयता'},
        heading: {en: 'Sharing', hi: 'साझाकरण'},
        body: {
          en: 'We may share data with regulated partners (e.g. RTAs, AMCs, payment providers) strictly as required to process your mutual fund transactions. We do not sell your personal data.',
          hi: 'म्यूचुअल फंड लेनदेन संसाधित करने हेतु आवश्यकतानुसार हम विनियमित भागीदारों (जैसे RTA, AMC, भुगतान प्रदाता) के साथ डेटा साझा कर सकते हैं। हम आपका व्यक्तिगत डेटा नहीं बेचते।',
        },
      },
      {
        category: {en: 'Privacy', hi: 'गोपनीयता'},
        heading: {en: 'Security', hi: 'सुरक्षा'},
        body: {
          en: 'We use industry-standard practices such as encrypted transport (HTTPS), secure token handling patterns, and access controls. No method is 100% secure; protect your device and credentials.',
          hi: 'हम एन्क्रिप्टेड ट्रांसपोर्ट (HTTPS), सुरक्षित टोकन हैंडलिंग और एक्सेस नियंत्रण जैसे उद्योग मानकों का पालन करते हैं। कोई विधि 100% सुरक्षित नहीं; अपना डिवाइस और क्रेडेंशियल सुरक्षित रखें।',
        },
      },
      {
        category: {en: 'Privacy', hi: 'गोपनीयता'},
        heading: {en: 'Your choices', hi: 'आपके विकल्प'},
        body: {
          en: 'You can request account deactivation as per app flows where available, manage app permissions from device settings, and avoid sharing OTPs or passwords with anyone.',
          hi: 'जहाँ उपलब्ध हो ऐप फ्लो के अनुसार खाता निष्क्रिय करने का अनुरोध कर सकते हैं, डिवाइस सेटिंग्स से अनुमतियाँ प्रबंधित करें, और OTP/पासवर्ड किसी के साथ साझा न करें।',
        },
      },
      {
        category: {en: 'Privacy', hi: 'गोपनीयता'},
        heading: {en: 'Updates', hi: 'अपडेट'},
        body: {
          en: 'We may update this summary as the product evolves. Material changes will be communicated in-app or on our website where applicable.',
          hi: 'उत्पाद विकास के साथ हम यह सारांश अपडेट कर सकते हैं। महत्वपूर्ण बदलाव ऐप या वेबसाइट पर सूचित किए जाएँगे, जहाँ लागू हो।',
        },
      },
    ],
  },
  terms: {
    title: {en: 'Terms and Conditions', hi: 'नियम और शर्तें'},
    sections: [
      {
        category: {en: 'Legal', hi: 'कानूनी'},
        heading: {en: 'Use of the app', hi: 'ऐप का उपयोग'},
        body: {
          en: 'By using Meon Mutual Funds, you agree to use the service lawfully and only for permitted investment activities. You are responsible for the accuracy of information you provide.',
          hi: 'Meon Mutual Funds उपयोग करके आप कानूनी रूप से और केवल अनुमत निवेश गतिविधियों के लिए सेवा उपयोग करने से सहमत हैं। आपके द्वारा दी गई जानकारी की सटीकता की जिम्मेदारी आपकी है।',
        },
      },
      {
        category: {en: 'Legal', hi: 'कानूनी'},
        heading: {en: 'Not investment advice', hi: 'निवेश सलाह नहीं'},
        body: {
          en: 'Content in the app is for information only. It is not investment, tax, or legal advice. Consult a qualified adviser before making investment decisions.',
          hi: 'ऐप की सामग्री केवल जानकारी हेतु है। यह निवेश, कर या कानूनी सलाह नहीं है। निवेश निर्णय से पहले योग्य सलाहकार से परामर्श करें।',
        },
      },
      {
        category: {en: 'Legal', hi: 'कानूनी'},
        heading: {en: 'Transactions', hi: 'लेनदेन'},
        body: {
          en: 'Orders are subject to scheme rules, cut-off times, KYC status, available payment modes, and RTA/AMC processing. Rejections or delays may occur for regulatory or operational reasons.',
          hi: 'ऑर्डर योजना नियमों, कट-ऑफ समय, KYC स्थिति, उपलब्ध भुगतान मोड और RTA/AMC प्रक्रिया के अधीन हैं। नियामक या परिचालन कारणों से अस्वीकृति या विलंब हो सकता है।',
        },
      },
      {
        category: {en: 'Legal', hi: 'कानूनी'},
        heading: {en: 'Risks', hi: 'जोखिम'},
        body: {
          en: 'Mutual fund investments are subject to market risks. Read all scheme-related documents carefully before investing.',
          hi: 'म्यूचुअल फंड निवेश बाजार जोखिमों के अधीन हैं। निवेश से पहले सभी योजना संबंधी दस्तावेज़ ध्यान से पढ़ें।',
        },
      },
      {
        category: {en: 'Legal', hi: 'कानूनी'},
        heading: {en: 'Limitation of liability', hi: 'दायित्व की सीमा'},
        body: {
          en: 'To the extent permitted by law, we are not liable for indirect losses, market losses, or issues arising from third-party services, network outages, or factors outside our reasonable control.',
          hi: 'कानून द्वारा अनुमत सीमा तक, हम अप्रत्यक्ष हानि, बाजार हानि, तृतीय-पक्ष सेवाओं, नेटवर्क आउटेज या हमारे उचित नियंत्रण से परे कारकों से उत्पन्न मुद्दों के लिए उत्तरदायी नहीं हैं।',
        },
      },
      {
        category: {en: 'Legal', hi: 'कानूनी'},
        heading: {en: 'Changes', hi: 'परिवर्तन'},
        body: {
          en: 'We may modify features or these terms. Continued use after updates constitutes acceptance where permitted by law.',
          hi: 'हम सुविधाएँ या ये नियम बदल सकते हैं। अपडेट के बाद निरंतर उपयोग कानून द्वारा अनुमत सीमा तक स्वीकृति माना जा सकता है।',
        },
      },
    ],
  },
};

export function getSupportUi(lang) {
  const L = lang === 'hi' ? 'hi' : 'en';
  return SUPPORT_UI[L];
}

export function getArticleI18n(id, lang) {
  const L = lang === 'hi' ? 'hi' : 'en';
  const raw = ART[id] || ART.faq;
  return {
    title: raw.title[L],
    sections: raw.sections.map(s => ({
      category: s.category[L],
      heading: s.heading[L],
      body: s.body[L],
    })),
  };
}

/** Short privacy copy for standalone Privacy Policy screen (paragraphs). */
export function getPrivacyIntroParagraphs(lang) {
  const L = lang === 'hi' ? 'hi' : 'en';
  const p = {
    en: [
      'Please read our privacy policy carefully before using the app operated by Meon.',
      'We collect only the information needed to provide your investment account features, maintain app security, and comply with applicable regulations.',
      'Your data is shared only with regulated partners where necessary to process transactions, mandates, and order execution. We do not sell personal data.',
      'You can contact support if you need clarification or updates regarding personal details and account-related information.',
    ],
    hi: [
      'Meon द्वारा संचालित ऐप का उपयोग करने से पहले कृपया हमारी गोपनीयता नीति ध्यान से पढ़ें।',
      'हम केवल वही जानकारी एकत्र करते हैं जो आपके निवेश खाता सुविधाएँ, ऐप सुरक्षा और लागू नियमों का पालन करने के लिए आवश्यक है।',
      'लेनदेन, मैंडेट और ऑर्डर निष्पादन संसाधित करने हेतु आवश्यकतानुसार ही आपका डेटा विनियमित भागीदारों के साथ साझा किया जाता है। हम व्यक्तिगत डेटा नहीं बेचते।',
      'व्यक्तिगत विवरण या खाता संबंधी जानकारी के लिए स्पष्टीकरण या अपडेट चाहिए तो सपोर्ट से संपर्क करें।',
    ],
  };
  return p[L];
}
