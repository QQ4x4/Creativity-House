export default function PrivacyContent({ lang = 'en' }) {
  if (lang === 'ar') {
    return (
      <>
        <h1>سياسة الخصوصية</h1>
        <p>
          <strong>تاريخ السريان:</strong> سبتمبر 2026
        </p>
        <p>
          تلتزم Creativity House Sdn Bhd. (&quot;نحن&quot; أو &quot;خاصتنا&quot;) بحماية خصوصيتك.
          تشرح سياسة الخصوصية هذه كيف نقوم بجمع معلوماتك واستخدامها والإفصاح عنها وحمايتها عند
          زيارتك لموقعنا أو استخدامك لمنصة التدريب الخاصة بنا.
        </p>

        <h2>1. المعلومات التي نجمعها</h2>
        <p>نجمع المعلومات التي تقدمها لنا مباشرة، بما في ذلك:</p>
        <ul>
          <li>
            <strong>المعلومات الشخصية:</strong> الاسم وعنوان البريد الإلكتروني ورقم الهاتف والتفاصيل
            المهنية المقدمة أثناء التسجيل أو استفسارات الشركات.
          </li>
          <li>
            <strong>معلومات الدفع:</strong> نستخدم Stripe كمعالج دفع تابع لجهة خارجية. لا نقوم
            بتخزين رقم بطاقة الائتمان بالكامل أو رمز CVV على خوادمنا.
          </li>
          <li>
            <strong>بيانات الاستخدام:</strong> معلومات حول كيفية تفاعلك مع دوراتنا والمحاكيات
            والموقع الإلكتروني (مثل تتبع التقدم، وعنوان IP، ونوع المتصفح).
          </li>
        </ul>

        <h2>2. كيف نستخدم معلوماتك</h2>
        <p>نستخدم المعلومات التي تم جمعها للأغراض التالية:</p>
        <ul>
          <li>لتوفير وتشغيل وصيانة منصتنا التعليمية.</li>
          <li>
            لمعالجة المعاملات وإرسال المعلومات ذات الصلة، بما في ذلك تأكيدات الشراء والفواتير.
          </li>
          <li>لإدارة حسابك وتتبع تقدمك في الدورات.</li>
          <li>للرد على تعليقاتك وأسئلتك وطلبات الدعم.</li>
          <li>لإرسال الإشعارات الفنية والتنبيهات الأمنية والرسائل الإدارية.</li>
        </ul>

        <h2>3. مشاركة معلوماتك</h2>
        <p>
          نحن لا نبيع أو نتاجر أو نؤجر معلوماتك الشخصية لأطراف ثالثة. قد نشارك معلوماتك فقط في
          الحالات التالية:
        </p>
        <ul>
          <li>
            <strong>مزودو الخدمات:</strong> مع موردين موثوقين من أطراف ثالثة (مثل Vercel و Railway و
            Stripe) الذين يؤدون خدمات نيابة عنا.
          </li>
          <li>
            <strong>الالتزامات القانونية:</strong> إذا طُلب منا ذلك بموجب القانون أو استجابة لطلبات
            صحيحة من قبل السلطات العامة.
          </li>
        </ul>

        <h2>4. أمن البيانات</h2>
        <p>
          نقوم بتنفيذ تدابير أمنية متوافقة مع معايير الصناعة (بما في ذلك تشفير SSL واستضافة قواعد
          البيانات الآمنة) للحفاظ على سلامة معلوماتك الشخصية. ومع ذلك، لا توجد طريقة نقل عبر الإنترنت
          آمنة بنسبة 100%، ولا يمكننا ضمان الأمان المطلق.
        </p>

        <h2>5. حقوق البيانات الخاصة بك</h2>
        <p>
          اعتمادًا على موقعك، قد يكون لك الحق في الوصول إلى المعلومات الشخصية التي نحتفظ بها عنك أو
          تحديثها أو حذفها. يمكنك تحديث معلومات حسابك مباشرة في لوحة تحكم المستخدم الخاصة بك أو
          التواصل معنا على{' '}
          <a href="mailto:info@creativity-house.com">info@creativity-house.com</a> للحصول على
          المساعدة.
        </p>
      </>
    );
  }

  return (
    <>
      <h1>Privacy Policy</h1>
      <p>
        <strong>Effective Date:</strong> September 2026
      </p>
      <p>
        Creativity House Sdn Bhd. (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed
        to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and
        safeguard your information when you visit our website or use our training platform.
      </p>

      <h2>1. Information We Collect</h2>
      <p>We collect information that you directly provide to us, including:</p>
      <ul>
        <li>
          <strong>Personal Information:</strong> Name, email address, phone number, and professional
          details provided during registration or corporate inquiries.
        </li>
        <li>
          <strong>Payment Information:</strong> We use Stripe as a third-party payment processor. We
          do not store your full credit card number or CVV on our servers.
        </li>
        <li>
          <strong>Usage Data:</strong> Information about how you interact with our courses,
          simulators, and website (e.g., progress tracking, IP address, browser type).
        </li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <p>We use the collected information for the following purposes:</p>
      <ul>
        <li>To provide, operate, and maintain our educational platform.</li>
        <li>
          To process transactions and send related information, including purchase confirmations and
          invoices.
        </li>
        <li>To manage your account and track your course progress.</li>
        <li>To respond to your comments, questions, and support requests.</li>
        <li>To send technical notices, security alerts, and administrative messages.</li>
      </ul>

      <h2>3. Sharing Your Information</h2>
      <p>
        We do not sell, trade, or rent your personal information to third parties. We may share your
        information only in the following situations:
      </p>
      <ul>
        <li>
          <strong>Service Providers:</strong> With trusted third-party vendors (like Vercel,
          Railway, and Stripe) who perform services on our behalf.
        </li>
        <li>
          <strong>Legal Obligations:</strong> If required to do so by law or in response to valid
          requests by public authorities.
        </li>
      </ul>

      <h2>4. Data Security</h2>
      <p>
        We implement industry-standard security measures (including SSL encryption and secure
        database hosting) to maintain the safety of your personal information. However, no method of
        transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
      </p>

      <h2>5. Your Data Rights</h2>
      <p>
        Depending on your location, you may have the right to access, update, or delete the personal
        information we hold about you. You can update your account information directly in your user
        dashboard or contact us at{' '}
        <a href="mailto:info@creativity-house.com">info@creativity-house.com</a> for assistance.
      </p>
    </>
  );
}
