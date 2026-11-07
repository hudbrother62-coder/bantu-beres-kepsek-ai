const $=id=>document.getElementById(id);
const msg=(value,error=false)=>{const el=$('recovery-message');el.textContent=value;el.style.color=error?'#b91c1c':'#047857'};
const request=$('request-form'),save=$('save-form');
let client=null,verified=false;
async function setup(){
 try{
  const res=await fetch('/api/config',{cache:'no-store'});if(!res.ok)throw Error('Konfigurasi autentikasi belum tersedia.');
  const config=await res.json();if(!config.supabaseUrl||!config.supabasePublishableKey)throw Error('Supabase belum dikonfigurasi.');
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.75.1?bundle');
  client=createClient(config.supabaseUrl,config.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  if(new URLSearchParams(location.search).get('mode')==='finish'){
   $('recovery-title').textContent='Buat password baru';$('recovery-description').textContent='Ganti password setelah membuka tautan pemulihan dari email.';
   request.hidden=true;save.hidden=true;
   const {data:{subscription}}=client.auth.onAuthStateChange((event,session)=>{
    if(event==='PASSWORD_RECOVERY'&&session){verified=true;save.hidden=false;msg('Tautan berhasil diverifikasi.')}
   });
   const {data,error}=await client.auth.getUser();
   if(!error&&data.user){verified=true;save.hidden=false;msg('Sesi pemulihan terverifikasi.')}
   else msg('Tautan tidak valid atau sudah kedaluwarsa. Ajukan pemulihan baru.',true);
   window.addEventListener('pagehide',()=>subscription.unsubscribe(),{once:true});
  }
 }catch(error){msg(error.message||'Koneksi autentikasi gagal.',true);}
}
request.addEventListener('submit',async event=>{
 event.preventDefault();if(!client){msg('Koneksi belum siap.',true);return;}
 const email=$('reset-email').value.trim().toLowerCase(),key='bb-kepsek-recovery:'+email;
 if(Date.now()-Number(localStorage.getItem(key)||0)<60*60*1000){msg('Permintaan sebelumnya sudah tercatat di browser ini. Cek inbox dan spam. Tidak membuat permintaan baru.');return;}
 const button=request.querySelector('button');button.disabled=true;msg('Memproses permintaan…');
 try{
  const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/reset-password?mode=finish'});
  if(error)throw error;
  localStorage.setItem(key,String(Date.now()));
  msg('Jika email terdaftar dan layanan email aktif, tautan pemulihan akan dikirim. Cek inbox dan spam. Jangan meminta berulang.');
 }catch(error){msg(error.message||'Email gagal dikirim.',true);}finally{button.disabled=false;}
});
save.addEventListener('submit',async event=>{
 event.preventDefault();if(!client||!verified){msg('Sesi pemulihan tidak valid.',true);return;}
 const password=$('new-password').value,confirmation=$('confirm-password').value;
 if(password.length<8||password!==confirmation){msg('Password minimal 8 karakter dan konfirmasi harus sama.',true);return;}
 const button=save.querySelector('button');button.disabled=true;
 try{const {error}=await client.auth.updateUser({password});if(error)throw error;await client.auth.signOut();verified=false;save.hidden=true;msg('Password berhasil diganti. Silakan login kembali.');}
 catch(error){msg(error.message||'Gagal mengganti password.',true);}finally{button.disabled=false;}
});
void setup();
