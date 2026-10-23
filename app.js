// ستائر أركان الطليعة — Firebase Realtime Database + Firebase Authentication
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import { getDatabase, ref, push, set, update, remove, onValue } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js';

const firebaseConfig = {
  apiKey: 'AIzaSyApAdiUqAAV6cblR3xLXIRmJmke_4yeu9A',
  authDomain: 'arkan-curtains.firebaseapp.com',
  databaseURL: 'https://arkan-curtains-default-rtdb.firebaseio.com',
  projectId: 'arkan-curtains',
  storageBucket: 'arkan-curtains.firebasestorage.app',
  messagingSenderId: '982809563781',
  appId: '1:982809563781:web:504a5013bf7b9a9e2b4fec',
  measurementId: 'G-41MNY4N2B6'
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const $ = id => document.getElementById(id);
const fields = ['name','phone','room','type','width','height','notes'];
let records = [], selectedId = null, editingId = null, unsubscribeRecords = null, currentUser = null;
const clean = v => String(v ?? '').trim();
function showStatus(msg){ $('setupStatus').textContent = msg; }
function setAppEnabled(enabled){
  document.querySelectorAll('#customerForm input,#customerForm select,#customerForm textarea,#customerForm button,#search,#refreshBtn').forEach(el=>el.disabled=!enabled);
  if ($('logoutBtn')) $('logoutBtn').classList.add('hidden');
}
function formData(){return Object.fromEntries(fields.map(k=>[k,clean($(k).value)]));}
function fillForm(r={}){fields.forEach(k=>$(k).value=r[k]||'');$('formTitle').textContent=r.id?'تعديل بيانات الزبون':'إضافة زبون جديد';$('saveBtn').textContent=r.id?'حفظ التعديلات':'حفظ بيانات الزبون';}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function render(){
 const q=clean($('search').value).toLocaleLowerCase();
 const filtered=records.filter(r=>[r.name,r.phone,r.room,r.type].some(v=>clean(v).toLocaleLowerCase().includes(q)));
 $('count').textContent=`عدد السجلات: ${records.length} — نتائج البحث: ${filtered.length}`;
 $('customerList').innerHTML=filtered.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).map(r=>`<div class="customer"><div><b>${esc(r.name)}</b><div class="muted">${esc(r.phone)}${r.room?' • '+esc(r.room):''}</div></div><button class="secondary" data-open="${esc(r.id)}">عرض البيانات</button></div>`).join('')||'<p class="muted">لا توجد سجلات مطابقة.</p>';
 $('customerList').querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>showDetails(b.dataset.open)));
}
function showDetails(id){
 const r=records.find(x=>x.id===id);if(!r)return;selectedId=id;
 const labels={name:'اسم الزبون',phone:'رقم الجوال',room:'اسم الغرفة',type:'نوع الستارة',width:'العرض (متر)',height:'الطول (متر)',notes:'ملاحظات'};
 $('details').innerHTML=fields.map(k=>`<div class="datum"><small>${labels[k]}</small><b>${esc(r[k]||'—')}</b></div>`).join('');
 $('detailCard').classList.remove('hidden');
}
// تسجيل دخول تلقائي بدون بريد أو كلمة مرور
$('loginCard').classList.add('hidden');
$('logoutBtn').classList.add('hidden');
function authError(err){
 const code=err?.code||'';
 const messages={
  'auth/invalid-credential':'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  'auth/invalid-email':'صيغة البريد الإلكتروني غير صحيحة.',
  'auth/user-not-found':'لا يوجد حساب بهذا البريد. أنشئ الحساب أولًا.',
  'auth/wrong-password':'كلمة المرور غير صحيحة.',
  'auth/email-already-in-use':'هذا البريد مسجل مسبقًا؛ استخدم تسجيل الدخول.',
  'auth/weak-password':'كلمة المرور ضعيفة؛ استخدم 6 أحرف على الأقل.',
  'auth/network-request-failed':'تعذر الاتصال بالإنترنت. تحقق من الشبكة.',
  'auth/operation-not-allowed':'فعّل تسجيل الدخول المجهول من Firebase Authentication > طريقة تسجيل الدخول.',
  'auth/admin-restricted-operation':'تأكد من تفعيل تسجيل الدخول المجهول في Firebase Authentication.',
  'PERMISSION_DENIED':'رفضت قواعد قاعدة البيانات الوصول. راجع ملف FIREBASE_RULES.json والتعليمات.'
 };
 return messages[code]||`تعذر إكمال العملية (${code||'خطأ غير معروف'}). تحقق من إعدادات Firebase والإنترنت.`;
}
$('customerForm').addEventListener('submit',async e=>{
 e.preventDefault(); if(!currentUser){alert('جارٍ تجهيز الدخول التلقائي؛ انتظر قليلًا ثم حاول مرة أخرى.');return;}
 const d=formData();
 if(!d.name||!d.phone||!d.type||!d.width||!d.height){alert('يرجى تعبئة الاسم والجوال ونوع الستارة والعرض والطول.');return;}
 const now=Date.now(); $('saveBtn').disabled=true;
 try {
  if(editingId){const old=records.find(r=>r.id===editingId); if(!old)throw new Error('لم يتم العثور على السجل.'); await update(ref(db,`customers/${editingId}`),{...d,updatedAt:now,updatedBy:currentUser.uid});}
  else {const newRef=push(ref(db,'customers'));await set(newRef,{...d,createdAt:now,updatedAt:now,createdBy:currentUser.uid,updatedBy:currentUser.uid});}
  editingId=null;fillForm();showStatus('متصل بالسحابة: تم حفظ بيانات الزبون، وستظهر التغييرات على أجهزة العمال المسجلين.');
 } catch(err){alert('لم يتم حفظ البيانات: '+authError(err));}
 finally {$('saveBtn').disabled=false;}
});
$('clearBtn').onclick=()=>{editingId=null;fillForm();};
$('search').addEventListener('input',render);
$('refreshBtn').onclick=()=>{if(!currentUser){alert('جارٍ تجهيز الدخول التلقائي؛ انتظر قليلًا ثم حاول مرة أخرى.');return;}showStatus('القائمة تتحدث تلقائيًا من قاعدة البيانات السحابية.');};
$('closeDetails').onclick=()=>$('detailCard').classList.add('hidden');
$('editBtn').onclick=()=>{const r=records.find(x=>x.id===selectedId);if(!r)return;editingId=r.id;fillForm(r);window.scrollTo({top:0,behavior:'smooth'});};
$('deleteBtn').onclick=async()=>{if(!selectedId||!currentUser)return;if(!confirm('هل تريد حذف سجل هذا الزبون من قاعدة البيانات المشتركة لجميع العمال؟'))return;
 try{await remove(ref(db,`customers/${selectedId}`));$('detailCard').classList.add('hidden');selectedId=null;showStatus('تم حذف السجل من قاعدة البيانات المشتركة.');}
 catch(err){alert('تعذر حذف السجل: '+authError(err));}
};
let startingAnonymousSignIn=false;
onAuthStateChanged(auth,async user=>{
 if(!user){
  currentUser=null; setAppEnabled(false); $('loginCard').classList.add('hidden'); $('logoutBtn').classList.add('hidden');
  if(unsubscribeRecords){unsubscribeRecords();unsubscribeRecords=null;}
  records=[]; render();
  if(!startingAnonymousSignIn){
   startingAnonymousSignIn=true; showStatus('جارٍ الدخول التلقائي…');
   try{await signInAnonymously(auth);}
   catch(err){$('loginCard').classList.remove('hidden');showStatus('تعذر الدخول التلقائي: '+authError(err)+' تأكد من تفعيل «مجهول» في المصادقة.');}
   finally{startingAnonymousSignIn=false;}
  }
  return;
 }
 currentUser=user; setAppEnabled(true); $('loginCard').classList.add('hidden'); $('logoutBtn').classList.add('hidden');
 $('accountInfo').textContent='الدخول التلقائي مفعّل — بيانات مشتركة';
 if(unsubscribeRecords){unsubscribeRecords();unsubscribeRecords=null;}
 showStatus('تم الدخول تلقائيًا. جارٍ الاتصال بقاعدة البيانات السحابية…');
 unsubscribeRecords=onValue(ref(db,'customers'),snapshot=>{
  const value=snapshot.val()||{};
  records=Object.entries(value).map(([id,r])=>({...r,id}));render();
  showStatus('متصل بالسحابة. تتحدث قائمة الزبائن تلقائيًا على الأجهزة التي تفتح التطبيق.');
 },err=>{showStatus('تعذر قراءة قاعدة البيانات: '+authError(err)+' تأكد من قواعد الأمان في Firebase.');});
});
