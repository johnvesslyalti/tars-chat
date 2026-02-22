"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function Home() {
  const { user } = useUser();
  const createUser = useMutation(api.users.createUser);

  useEffect(() => {
    if (!user) return;

    createUser({
      clerkId: user.id,
      name: user.fullName ?? "Anonymous",
      imageUrl: user.imageUrl,
    });
  }, [user]);

  return (
    <main className="h-screen flex items-center justify-center">
      <SignedOut>
        <SignInButton />
      </SignedOut>

      <SignedIn>
        <div className="flex flex-col gap-4">
          <p>Welcome</p>
          <UserButton />
        </div>
      </SignedIn>
    </main>
  );
}