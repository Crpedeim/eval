import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <form action={async () => { "use server"; await signIn("github", { redirectTo: "/projects" }); }}>
        <button type="submit" className="rounded bg-black px-6 py-3 text-white">
          Sign in with GitHub
        </button>
      </form>
    </main>
  );
}