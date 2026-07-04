import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { store, seedDemoIfEmpty } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@elsewedy.eg");
  const [pass, setPass] = useState("demo");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    seedDemoIfEmpty();
    store.login(email);
    nav("/executive");
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2" dir="rtl">
      <div className="brand-gradient text-primary-foreground p-10 md:p-16 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 20% 30%, hsl(var(--brand-gold)/0.6), transparent 40%), radial-gradient(circle at 80% 70%, hsl(var(--brand-red)/0.4), transparent 40%)" }} />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl gold-gradient grid place-items-center text-brand-navy font-black text-xl">س</div>
            <div>
              <div className="text-sm text-primary-foreground/80">Elsewedy Print House</div>
              <div className="font-bold text-lg">السويدي بيت الطباعة</div>
            </div>
          </div>
          <h1 className="mt-16 text-3xl md:text-5xl font-extrabold leading-tight">
            مركز ذكاء العملاء
          </h1>
          <p className="mt-4 text-primary-foreground/85 max-w-md text-lg">
            تحليل ذكي لمعاملات العملاء وفرص النمو.
          </p>
          <ul className="mt-10 space-y-2 text-primary-foreground/85 text-sm">
            <li>• تحليل تلقائي لملفات الإكسل والطلبات السنوية</li>
            <li>• رصد فرص إعادة الطلب والمنتجات المتوقفة</li>
            <li>• لوحات تنفيذية جاهزة للطباعة الديجيتال والأوفست والتغليف</li>
          </ul>
        </div>
        <div className="relative text-xs text-primary-foreground/60">© {new Date().getFullYear()} Elsewedy Print House – Internal system</div>
      </div>
      <div className="flex items-center justify-center p-10 bg-background">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-brand-navy">تسجيل الدخول</h2>
            <p className="text-sm text-muted-foreground mt-1">استخدم بياناتك التعريفية الداخلية.</p>
          </div>
          <div className="space-y-2">
            <Label>البريد الإلكتروني</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </div>
          <div className="space-y-2">
            <Label>كلمة المرور</Label>
            <Input value={pass} onChange={(e) => setPass(e.target.value)} type="password" required />
          </div>
          <Button type="submit" className="w-full bg-brand-navy hover:bg-brand-navy/90 text-primary-foreground">
            الدخول إلى المنصة
          </Button>
          <p className="text-xs text-muted-foreground text-center">النسخة التجريبية تعمل ببيانات محلية. أي بريد وكلمة مرور سيسمحان بالدخول.</p>
        </form>
      </div>
    </div>
  );
}