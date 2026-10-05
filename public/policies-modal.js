/**
 * CapZone Subtitle Studio - Universal Merchant Policies Modal
 * PayHere-Compliant Terms & Conditions, Privacy Policy, and Return/Refund Policy
 * Supports Dual Language: English & Sinhala (සිංහල)
 */

(function () {
  const POLICIES_DATA = {
    terms: {
      title_en: "Terms & Conditions",
      title_si: "සේවා කොන්දේසි සහ නීති රීති",
      icon: "file-text",
      badge_en: "Legal Agreement",
      badge_si: "නීතිමය ගිවිසුම",
      content_en: `
        <div class="space-y-4 text-xs sm:text-sm leading-relaxed text-slate-300">
          <div class="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-200">
            <strong>Platform:</strong> CapZone Subtitle Studio (operated by Kaveesha Theekshana, Sri Lanka).<br>
            <strong>Official Website:</strong> <a href="https://kaveesha.top" target="_blank" class="underline text-purple-300">kaveesha.top</a> | Contact: <a href="mailto:kaveeshatheekshana5@gmail.com" class="underline text-purple-300">kaveeshatheekshana5@gmail.com</a>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">1. Acceptance of Terms</h4>
            <p>By accessing or registering on CapZone Subtitle Studio ("CapZone", "we", "our"), you agree to abide by these Terms and Conditions and all applicable laws of the Democratic Socialist Republic of Sri Lanka. If you disagree with any portion of these terms, you must refrain from using the platform.</p>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">2. Description of Digital Services</h4>
            <p>CapZone provides web-based AI-powered video subtitle generation (.SRT format with Sinhala Unicode to FM-Abhaya font conversion), social media video/audio download tools, and AI background cutout tools. These are digital SaaS services delivered immediately upon online processing.</p>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">3. User Accounts & Security</h4>
            <p>You must provide an accurate email address upon registration. You are solely responsible for maintaining the confidentiality of your credentials and all activities occurring under your account.</p>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">4. Pricing, Payments & Currency</h4>
            <p>All transactions are billed in <strong>Sri Lankan Rupees (LKR)</strong> and processed through the <strong>PayHere Payment Gateway</strong>, a certified payment service provider licensed by the Central Bank of Sri Lanka (CBSL).</p>
            <ul class="list-disc pl-5 mt-1.5 space-y-1 text-slate-300">
              <li><strong>Pay-As-You-Go Credits:</strong> Mini Clip (0-1 min: Rs. 100), Standard Video (1-10 mins: Rs. 250), Extended Video (10-30 mins: Rs. 500).</li>
              <li><strong>Monthly Subscriptions:</strong> Creator Plan (Rs. 2,500/month for 120 mins quota), Pro Plan (Rs. 5,000/month for 300 mins quota).</li>
              <li><strong>Free Tier:</strong> Users who configure their own Google Gemini API key enjoy free subtitle generation.</li>
            </ul>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">5. Fair Use & Prohibited Conduct</h4>
            <p>Users must not upload content that is illegal, defamatory, obscene, or infringes third-party intellectual property. System duration is strictly capped at 30 minutes per video, with a maximum file upload size of 500 MB.</p>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">6. Limitation of Liability</h4>
            <p>CapZone shall not be liable for indirect, incidental, or consequential damages resulting from service interruptions or third-party AI model variations. Our aggregate liability is strictly limited to the amount paid by the user in the preceding 30 days.</p>
          </div>


        </div>
      `,
      content_si: `
        <div class="space-y-4 text-xs sm:text-sm leading-relaxed text-slate-300 font-sans">
          <div class="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-200">
            <strong>සේවා සපයන්නා:</strong> CapZone Subtitle Studio (මෙහෙයුම්කරු: කවීෂ තීක්ෂණ, ශ්‍රී ලංකාව).<br>
            <strong>නිල වෙබ් අඩවිය:</strong> <a href="https://kaveesha.top" target="_blank" class="underline text-purple-300">kaveesha.top</a> | ඊමේල්: <a href="mailto:kaveeshatheekshana5@gmail.com" class="underline text-purple-300">kaveeshatheekshana5@gmail.com</a>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">1. සේවා කොන්දේසි පිළිගැනීම</h4>
            <p>CapZone Subtitle Studio ("CapZone", "අපගේ") වෙබ් අඩවිය හෝ සේවාවන් භාවිත කිරීම මගින් ඔබ මෙම සේවා කොන්දේසි සහ ශ්‍රී ලංකා ප්‍රජාතාන්ත්‍රික සමාජවාදී ජනරජයේ නීති රීතිවලට එකඟ වන බව තහවුරු කරයි. ඔබ මෙම කොන්දේසි වලට එකඟ නොවන්නේ නම් සේවාව භාවිතයෙන් වළකින්න.</p>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">2. ඩිජිටල් සේවාවන් පිළිබඳ විස්තරය</h4>
            <p>CapZone යනු AI තාක්ෂණය ඔස්සේ ස්වයංක්‍රීයව සිංහල සහ ඉංග්‍රීසි Subtitles (.SRT ගොනු - FM-Abhaya අකුරු පරිවර්තනය සමඟ), සමාජ මාධ්‍ය වීඩියෝ/ශ්‍රව්‍ය බාගත කිරීම්, සහ AI Background Removal පහසුකම් සපයන ඩිජිටල් මෘදුකාංග පද්ධතියකි.</p>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">3. පරිශීලක ගිණුම සහ ආරක්ෂාව</h4>
            <p>ලියාපදිංචි වීමේදී නිවැරදි විද්‍යුත් තැපැල් (Email) ලිපිනයක් ලබා දිය යුතුය. ඔබගේ ගිණුමේ මුරපදය සහ ගිණුම හරහා සිදුවන සියලුම ක්‍රියාකාරකම්වල වගකීම ඔබ සතු වේ.</p>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">4. මිල ගණන්, ගෙවීම් සහ මුදල් ඒකකය</h4>
            <p>සියලුම ගෙවීම් <strong>ශ්‍රී ලංකා රුපියල් (LKR)</strong> වලින් අය කෙරෙන අතර ශ්‍රී ලංකා මහ බැංකුව (CBSL) මගින් අනුමත <strong>PayHere Payment Gateway</strong> හරහා අතිශය සුරක්ෂිතව සිදු කරනු ලැබේ.</p>
            <ul class="list-disc pl-5 mt-1.5 space-y-1 text-slate-300">
              <li><strong>Pay-Per-Video (එක් වීඩියෝවක් සඳහා):</strong> Mini Clip (මිනිත්තු 0-1: රු. 100), Standard Video (මිනිත්තු 1-10: රු. 250), Extended Video (මිනිත්තු 10-30: රු. 500).</li>
              <li><strong>මාසික පැකේජ (Monthly Packs):</strong> Creator Plan (රු. 2,500/මසකට - මිනිත්තු 120 ක quota), Pro Plan (රු. 5,000/මසකට - මිනිත්තු 300 ක quota).</li>
              <li><strong>නොමිලේ භාවිතය:</strong> තමන්ගේම Google Gemini API Key ඇතුළත් කරන අයට කිසිදු මුදල් අය කිරීමකින් තොරව Subtitles සාදාගත හැක.</li>
            </ul>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">5. සේවා සීමාවන් සහ භාවිත නීති</h4>
            <p>ප්‍රකාශන හිමිකම් උල්ලංඝනය වන, නීති විරෝධී හෝ අසභ්‍ය වීඩියෝ උඩුගත කිරීම සම්පූර්ණයෙන්ම තහනම්ය. උපරිම වීඩියෝ කාල සීමාව මිනිත්තු 30ක් වන අතර, උපරිම upload ධාරිතාව 500 MB වේ.</p>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">6. වගකීම් සීමාව</h4>
            <p>තෙවන පාර්ශවීය අන්තර්ජාල හෝ AI සේවා බිඳවැටීම් නිසා සිදුවන අලාභයන් සඳහා අප වගකීමට බැඳී නොමැත. අපගේ උපරිම වගකීම පසුගිය දින 30 තුළ ඔබ ගෙවූ මුදලට පමණක් සීමා වේ.</p>
          </div>


        </div>
      `
    },
    privacy: {
      title_en: "Privacy Policy",
      title_si: "පෞද්ගලිකත්ව ප්‍රතිපත්තිය",
      icon: "shield-check",
      badge_en: "Data Protection",
      badge_si: "දත්ත ආරක්ෂාව",
      content_en: `
        <div class="space-y-4 text-xs sm:text-sm leading-relaxed text-slate-300">
          <div class="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200">
            <strong>Security Commitment:</strong> CapZone respects and protects your digital privacy. We never sell your personal data or retain uploaded media files permanently.
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">1. Information We Collect</h4>
            <p>We collect minimal information necessary to deliver our services:</p>
            <ul class="list-disc pl-5 mt-1 space-y-1">
              <li><strong>Account Information:</strong> Your registered email address and basic profile metadata.</li>
              <li><strong>Transaction Records:</strong> Order reference IDs, package tier, amount paid, and timestamp (maintained for accounting purposes).</li>

            </ul>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">2. Payment Security & Card Data (PayHere)</h4>
            <p class="text-emerald-300 font-semibold">CapZone DOES NOT store, capture, or have access to your Credit/Debit Card numbers, CVV, or Online Banking credentials.</p>
            <p class="mt-1">All financial transactions are redirected and processed through the PCI-DSS certified <strong>PayHere Payment Gateway</strong>. Communication with PayHere utilizes 256-bit bank-grade SSL encryption.</p>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">3. Automated Media File Deletion (15-Minute Policy)</h4>
            <p>Uploaded video and audio files are stored in temporary memory strictly during processing. Our automated system permanently wipes and purges all media files within <strong>15 minutes</strong> of generation completion. Your private content is never used to train public models.</p>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">4. Cookies & Local Storage</h4>
            <p>We use browser local storage solely to retain your session authentication token, API preference mode (Cloud vs Custom Key), and UI workspace settings.</p>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">5. Third-Party Service Providers</h4>
            <p>We partner only with industry-leading infrastructure providers:</p>
            <ul class="list-disc pl-5 mt-1 space-y-1">
              <li><strong>PayHere (PVT) Ltd:</strong> For secure payment gateway operations in Sri Lanka.</li>
              <li><strong>Google Gemini AI:</strong> For multimodal audio speech-to-text recognition under enterprise privacy terms.</li>
            </ul>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">6. User Rights & Data Deletion</h4>
            <p>You have the right to request deletion of your account and associated records at any time. Simply email our data protection officer at <a href="mailto:kaveeshatheekshana5@gmail.com" class="text-blue-400 underline">kaveeshatheekshana5@gmail.com</a>.</p>
          </div>
        </div>
      `,
      content_si: `
        <div class="space-y-4 text-xs sm:text-sm leading-relaxed text-slate-300 font-sans">
          <div class="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200">
            <strong>ආරක්ෂක ප්‍රතිඥාව:</strong> CapZone ඔබගේ පෞද්ගලිකත්වය සහ දත්ත ආරක්ෂාව උපරිමයෙන් සුරකියි. අප කිසිවිටෙක ඔබගේ දත්ත අලෙවි නොකරන අතර වීඩියෝ ගොනු ස්ථිරව තබා නොගනී.
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">1. අප රැස් කරන තොරතුරු</h4>
            <p>සේවාව සැපයීමට අත්‍යවශ්‍ය අවම තොරතුරු පමණක් අප ලබා ගනිමු:</p>
            <ul class="list-disc pl-5 mt-1 space-y-1">
              <li><strong>ගිණුම් තොරතුරු:</strong> ලියාපදිංචි විද්‍යුත් තැපෑල (Email) සහ ගිණුම් විස්තර.</li>
              <li><strong>ගනුදෙනු වාර්තා:</strong> Order ID, ලබාගත් පැකේජය, ගෙවූ මුදල සහ දිනය.</li>

            </ul>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">2. ගෙවීම් ආරක්ෂාව සහ කාඩ්පත් තොරතුරු (PayHere)</h4>
            <p class="text-emerald-300 font-semibold">CapZone කිසිදු අවස්ථාවක ඔබගේ Credit/Debit කාඩ්පත් අංක, CVV කේත හෝ බැංකු රහස්‍ය තොරතුරු ලබාගැනීම හෝ ගබඩා කර තබා ගැනීම සිදු නොකරයි.</p>
            <p class="mt-1">සියලුම ගෙවීම් ශ්‍රී ලංකා මහ බැංකුව අනුමත PayHere ගෙවීම් ද්වාරය හරහා 256-bit බැංකු මට්ටමේ SSL සංකේතනය ඔස්සේ සෘජුවම සිදු කෙරේ.</p>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">3. ගොනු ස්වයංක්‍රීයව මකා දැමීම (විනාඩි 15 නීතිය)</h4>
            <p>ඔබ උඩුගත කරන සියලුම වීඩියෝ සහ හඬ ගොනු උපසිරැසි සාදා අවසන් වී <strong>විනාඩි 15ක් ඇතුළත</strong> අපගේ සර්වර්වලින් සම්පූර්ණයෙන්ම සහ ස්ථිරවම මකා දමනු ලැබේ.</p>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">4. Cookies සහ Local Storage</h4>
            <p>ඔබගේ Login සැසිය රඳවා ගැනීමට සහ ඔබ තෝරාගත් සැකසුම් (Dark theme, API options) මතක තබා ගැනීමට පමණක් බ්‍රව්සරයේ Local Storage භාවිත කෙරේ.</p>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">5. තෙවන පාර්ශවීය සේවාවන්</h4>
            <p>අප සහයෝගීව කටයුතු කරන්නේ ලොව පිළිගත් ආයතන සමඟ පමණි:</p>
            <ul class="list-disc pl-5 mt-1 space-y-1">
              <li><strong>PayHere (PVT) Ltd:</strong> ශ්‍රී ලංකාවේ ආරක්ෂිත මාර්ගගත ගෙවීම් සඳහා.</li>
              <li><strong>Google Gemini AI:</strong> හඬ විශ්ලේෂණය කර අකුරු හඳුනාගැනීම සඳහා.</li>
            </ul>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">6. ඔබගේ අයිතීන්</h4>
            <p>ඔබගේ ගිණුම හෝ දත්ත පද්ධතියෙන් සම්පූර්ණයෙන්ම ඉවත් කිරීමට අවශ්‍ය නම් ඕනෑම වේලාවක <a href="mailto:kaveeshatheekshana5@gmail.com" class="text-blue-400 underline">kaveeshatheekshana5@gmail.com</a> වෙත දන්වන්න.</p>
          </div>
        </div>
      `
    },
    refund: {
      title_en: "Return & Refund Policy",
      title_si: "මුදල් ආපසු ගෙවීමේ සහ අවලංගු කිරීමේ ප්‍රතිපත්තිය",
      icon: "refresh-cw",
      badge_en: "Fair Guarantee",
      badge_si: "සාධාරණ සහතිකය",
      content_en: `
        <div class="space-y-4 text-xs sm:text-sm leading-relaxed text-slate-300">
          <div class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
            <strong>Customer Satisfaction Guarantee:</strong> We ensure 100% fair handling of your wallet funds and subscriptions. If our system fails to deliver your subtitles, you are entitled to full credit restoration or refund.
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">1. Nature of Digital SaaS Goods</h4>
            <p>CapZone provides non-tangible, digital computational services delivered instantly via cloud processing. Due to this nature, minutes or credits that have already been consumed to generate valid .SRT files are non-refundable.</p>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">2. Technical Failure & System Error Guarantee (100% Refund/Credit)</h4>
            <p>If you upload a valid file under 30 minutes and the system deducts funds or quota minutes without producing your output due to a server error or AI exception, your wallet balance/quota will be <strong>100% automatically restored or credited</strong> to your account.</p>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">3. Unused Wallet Balance Refunds</h4>
            <p>If you deposit funds into your CapZone wallet (e.g. Rs. 200, Rs. 500) and have not utilized the balance, you may request a refund to your original payment method within <strong>7 days</strong> of the transaction. A small standard payment gateway processing fee (charged by PayHere/banks) may be deducted.</p>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">4. Monthly Subscription Cancellation</h4>
            <p>You can cancel your recurring monthly subscription (Creator or Pro) at any time through your dashboard or by emailing support. Upon cancellation, your plan remains active until the end of the current paid billing cycle, and no further renewal charges will occur.</p>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">5. Refund Processing Timeline</h4>
            <p>Once a refund is approved by our team, it is initiated immediately through PayHere. Funds will reflect in your bank account / card within <strong>3 to 7 business days</strong>, depending on your issuing bank's settlement cycle.</p>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">6. How to Request Support or a Refund</h4>
            <p>To request a refund or dispute a charge, provide your Order ID, registered email, and a brief description of the issue:</p>
            <div class="mt-2 p-3 rounded-lg bg-black/40 border border-white/10 text-xs space-y-1">
              <p>📧 <strong>Email:</strong> <a href="mailto:kaveeshatheekshana5@gmail.com" class="text-emerald-400 underline">kaveeshatheekshana5@gmail.com</a></p>
              <p>💬 <strong>WhatsApp:</strong> <a href="https://wa.me/94760246304" target="_blank" class="text-emerald-400 underline">0760246304</a></p>
              <p>⏱️ <strong>Response Time:</strong> Within 24 hours (Monday – Saturday)</p>
            </div>
          </div>
        </div>
      `,
      content_si: `
        <div class="space-y-4 text-xs sm:text-sm leading-relaxed text-slate-300 font-sans">
          <div class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
            <strong>පාරිභෝගික තෘප්තිමත්භාවය:</strong> ඔබගේ මුදල් සහ දායකත්වයන් සම්බන්ධයෙන් උපරිම සාධාරණත්වයකින් කටයුතු කිරීමට අප බැඳී සිටිමු. පද්ධතියේ දෝෂයක් නිසා උපසිරැසි නොලැබුනහොත් සම්පූර්ණ මුදල හෝ මිනිත්තු නැවත ලබා දේ.
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">1. ඩිජිටල් සේවා ස්වභාවය</h4>
            <p>CapZone සපයන්නේ ක්ෂණික ඩිජිටල් සේවාවන් (Instant Cloud Processing) බැවින්, සාර්ථකව නිමවා බාගත කරගත් උපසිරැසි හෝ දැනටමත් භාවිතා කර අවසන් වූ මිනිත්තු සඳහා මුදල් ආපසු ලබා දිය නොහැක.</p>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">2. කාර්මික දෝෂ සඳහා 100% ප්‍රතිපූරණය</h4>
            <p>පද්ධතියේ කිසියම් කාර්මික දෝෂයක් හේතුවෙන් ඔබගේ ගිණුමෙන් මුදල් හෝ Quota මිනිත්තු කැපී ගොස් උපසිරැසි නොලැබුනේ නම්, එම මුදල හෝ මිනිත්තු ගණන කිසිදු අයකිරීමකින් තොරව <strong>100% ක් ඔබගේ Wallet එකට නැවත එකතු කරනු ලැබේ</strong>.</p>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">3. භාවිත නොකළ Wallet මුදල් ආපසු ගැනීම</h4>
            <p>ඔබගේ Wallet එකට එකතු කළ මුදලින් කිසිදු සේවාවක් ලබා නොගෙන තිබේ නම්, ගෙවීම් කළ දින සිට <strong>දින 7ක් ඇතුළත</strong> එම මුදල ඔබගේ බැංකු කාඩ්පතටම ආපසු ඉල්ලා සිටිය හැක (බැංකු ගාස්තු හැර).</p>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">4. මාසික පැකේජ අවලංගු කිරීම</h4>
            <p>ඔබ ලබාගත් මාසික පැකේජය (Creator හෝ Pro) ඕනෑම මොහොතක අවලංගු කළ හැක. එවිට එම මාසය අවසන් වන තුරු සේවාව ලැබෙන අතර ඉදිරි මාස සඳහා කිසිදු මුදලක් අය නොකෙරේ.</p>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">5. මුදල් බැරවීමේ කාලසීමාව</h4>
            <p>අප විසින් අනුමත කරන ලද මුදල් ආපසු ගෙවීම් PayHere හරහා ක්‍රියාත්මක වන අතර බැංකු දිනයන් <strong>3ත් 7ත් අතර කාලයකදී</strong> ඔබ ගෙවීම් සිදුකළ බැංකු කාඩ්පතට/ගිණුමට බැර වේ.</p>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-1">6. සහාය සහ මුදල් ආපසු ඉල්ලුම් කිරීම</h4>
            <p>ඔබගේ Order ID අංකය, ඊමේල් ලිපිනය සහ විස්තරය අප වෙත යොමු කරන්න:</p>
            <div class="mt-2 p-3 rounded-lg bg-black/40 border border-white/10 text-xs space-y-1">
              <p>📧 <strong>ඊමේල්:</strong> <a href="mailto:kaveeshatheekshana5@gmail.com" class="text-emerald-400 underline">kaveeshatheekshana5@gmail.com</a></p>
              <p>💬 <strong>WhatsApp:</strong> <a href="https://wa.me/94760246304" target="_blank" class="text-emerald-400 underline">0760246304</a></p>
              <p>⏱️ <strong>ප්‍රතිචාර කාලය:</strong> පැය 24ක් ඇතුළත (සඳුදා – සෙනසුරාදා)</p>
            </div>
          </div>
        </div>
      `
    }
  };

  const ICONS = {
    'file-text': `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
    'shield-check': `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>`,
    'refresh-cw': `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`,
    'x': `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
  };

  let currentPolicy = 'terms';
  let currentLang = 'en'; // 'en' or 'si'

  function createPolicyModalDOM() {
    if (document.getElementById('policyModal')) return;

    const modal = document.createElement('div');
    modal.id = 'policyModal';
    modal.className = 'fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 transition-all duration-300 opacity-0 pointer-events-none';
    modal.style.display = 'none';

    modal.innerHTML = `
      <div id="policyModalBackdrop" class="absolute inset-0"></div>
      <div id="policyModalCard" class="glass-card w-full max-w-3xl rounded-3xl p-5 sm:p-7 relative max-h-[92vh] flex flex-col transform scale-95 transition-all duration-300 border border-white/20 shadow-2xl bg-neutral-950/95 z-10">
        
        <!-- Header -->
        <div class="flex items-center justify-between pb-4 border-b border-white/10 flex-shrink-0">
          <div class="flex items-center gap-3">
            <div id="policyIconContainer" class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shadow-lg">
              ${ICONS['shield-check']}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 id="policyModalTitle" class="text-base sm:text-lg font-black text-white tracking-wide">Terms & Conditions</h3>
                <span id="policyModalBadge" class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">Legal</span>
              </div>
              <p class="text-[11px] text-slate-400">CapZone Subtitle Studio &bull; PayHere Merchant Compliance</p>
            </div>
          </div>

          <!-- Language Switcher & Close Button -->
          <div class="flex items-center gap-2">
            <div class="flex items-center p-1 rounded-xl bg-white/5 border border-white/10 text-xs font-bold">
              <button type="button" id="policyLangBtnEn" onclick="window.switchPolicyLang('en')" class="px-2.5 py-1 rounded-lg bg-sky-500 text-white transition-all shadow-sm">English</button>
              <button type="button" id="policyLangBtnSi" onclick="window.switchPolicyLang('si')" class="px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition-all">සිංහල</button>
            </div>
            <button type="button" onclick="window.closePolicyModal()" class="text-slate-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              ${ICONS['x']}
            </button>
          </div>
        </div>

        <!-- Policy Selector Tabs -->
        <div class="flex items-center gap-2 pt-3 pb-3 overflow-x-auto flex-shrink-0 hide-scrollbar border-b border-white/5 text-xs font-bold">
          <button type="button" id="tabBtnTerms" onclick="window.switchPolicyTab('terms')" class="px-3.5 py-2 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1.5 transition-all">
            ${ICONS['file-text']}
            <span id="tabLabelTerms">Terms & Conditions</span>
          </button>
          <button type="button" id="tabBtnPrivacy" onclick="window.switchPolicyTab('privacy')" class="px-3.5 py-2 rounded-xl bg-white/5 text-slate-400 hover:text-white border border-transparent hover:border-white/10 flex items-center gap-1.5 transition-all">
            ${ICONS['shield-check']}
            <span id="tabLabelPrivacy">Privacy Policy</span>
          </button>
          <button type="button" id="tabBtnRefund" onclick="window.switchPolicyTab('refund')" class="px-3.5 py-2 rounded-xl bg-white/5 text-slate-400 hover:text-white border border-transparent hover:border-white/10 flex items-center gap-1.5 transition-all">
            ${ICONS['refresh-cw']}
            <span id="tabLabelRefund">Return & Refund</span>
          </button>
        </div>

        <!-- Content Area -->
        <div id="policyModalBody" class="flex-1 overflow-y-auto py-4 pr-1 text-slate-300 custom-scroll">
          <!-- Policy HTML injected dynamically -->
        </div>

        <!-- Footer -->
        <div class="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span id="policyFooterSecurityText">PayHere Verified Merchant &bull; CBSL Approved Gateway</span>
          </div>
          <button type="button" onclick="window.closePolicyModal()" class="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors">
            Close
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('policyModalBackdrop')?.addEventListener('click', window.closePolicyModal);
  }

  function renderPolicyContent() {
    const data = POLICIES_DATA[currentPolicy];
    if (!data) return;

    const titleEl = document.getElementById('policyModalTitle');
    const badgeEl = document.getElementById('policyModalBadge');
    const bodyEl = document.getElementById('policyModalBody');
    const iconContainer = document.getElementById('policyIconContainer');

    if (titleEl) titleEl.innerText = currentLang === 'si' ? data.title_si : data.title_en;
    if (badgeEl) badgeEl.innerText = currentLang === 'si' ? data.badge_si : data.badge_en;
    if (bodyEl) bodyEl.innerHTML = currentLang === 'si' ? data.content_si : data.content_en;

    // Update active tab styles
    const tabs = ['terms', 'privacy', 'refund'];
    tabs.forEach(t => {
      const btn = document.getElementById(`tabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
      if (btn) {
        if (t === currentPolicy) {
          btn.className = "px-3.5 py-2 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1.5 transition-all shadow-sm";
        } else {
          btn.className = "px-3.5 py-2 rounded-xl bg-white/5 text-slate-400 hover:text-white border border-transparent hover:border-white/10 flex items-center gap-1.5 transition-all";
        }
      }
    });

    // Update language buttons
    const btnEn = document.getElementById('policyLangBtnEn');
    const btnSi = document.getElementById('policyLangBtnSi');
    if (btnEn && btnSi) {
      if (currentLang === 'en') {
        btnEn.className = "px-2.5 py-1 rounded-lg bg-sky-500 text-white transition-all shadow-sm";
        btnSi.className = "px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition-all";
      } else {
        btnSi.className = "px-2.5 py-1 rounded-lg bg-sky-500 text-white transition-all shadow-sm";
        btnEn.className = "px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition-all";
      }
    }

    // Update Tab labels in Sinhala if needed
    const lblTerms = document.getElementById('tabLabelTerms');
    const lblPrivacy = document.getElementById('tabLabelPrivacy');
    const lblRefund = document.getElementById('tabLabelRefund');
    const footerSecurity = document.getElementById('policyFooterSecurityText');

    if (currentLang === 'si') {
      if (lblTerms) lblTerms.innerText = "සේවා කොන්දේසි";
      if (lblPrivacy) lblPrivacy.innerText = "පෞද්ගලිකත්වය";
      if (lblRefund) lblRefund.innerText = "මුදල් ආපසු ගැනීම";
      if (footerSecurity) footerSecurity.innerText = "PayHere සහතික කළ ගෙවීම් පද්ධතිය • CBSL අනුමතයි";
    } else {
      if (lblTerms) lblTerms.innerText = "Terms & Conditions";
      if (lblPrivacy) lblPrivacy.innerText = "Privacy Policy";
      if (lblRefund) lblRefund.innerText = "Return & Refund";
      if (footerSecurity) footerSecurity.innerText = "PayHere Verified Merchant • CBSL Approved Gateway";
    }

    if (iconContainer) {
      iconContainer.innerHTML = `<i data-lucide="${data.icon}" class="w-5 h-5"></i>`;
    }

    try {
      if (window.lucide) lucide.createIcons();
    } catch (e) {}
  }

  window.openPolicyModal = function (policy = 'terms', lang = null) {
    createPolicyModalDOM();
    currentPolicy = (policy === 'privacy' || policy === 'refund' || policy === 'terms') ? policy : 'terms';
    if (lang === 'si' || lang === 'en') {
      currentLang = lang;
    }

    renderPolicyContent();

    const modal = document.getElementById('policyModal');
    const card = document.getElementById('policyModalCard');
    if (modal && card) {
      modal.style.display = 'flex';
      modal.classList.remove('pointer-events-none', 'opacity-0');
      modal.classList.add('opacity-100');
      card.classList.remove('scale-95');
      card.classList.add('scale-100');
      document.body.classList.add('overflow-hidden');
    }
  };

  window.closePolicyModal = function () {
    const modal = document.getElementById('policyModal');
    const card = document.getElementById('policyModalCard');
    if (modal && card) {
      modal.classList.add('opacity-0', 'pointer-events-none');
      modal.classList.remove('opacity-100');
      card.classList.remove('scale-100');
      card.classList.add('scale-95');
      setTimeout(() => {
        modal.style.display = 'none';
        document.body.classList.remove('overflow-hidden');
      }, 250);
    }
  };

  window.switchPolicyTab = function (policy) {
    currentPolicy = policy;
    renderPolicyContent();
    const bodyEl = document.getElementById('policyModalBody');
    if (bodyEl) bodyEl.scrollTop = 0;
  };

  window.switchPolicyLang = function (lang) {
    currentLang = lang;
    renderPolicyContent();
  };

  document.addEventListener('DOMContentLoaded', () => {
    createPolicyModalDOM();
  });
})();
