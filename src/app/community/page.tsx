"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState({ title: "", content: "" });

  const { data, error, isLoading } = useQuery({
    queryKey: ["community"],
    queryFn: async () => {
      const res = await fetch("/api/community");
      if (!res.ok) throw new Error("Failed to fetch posts");
      return res.json();
    },
  });

  useEffect(() => {
    if (data) setPosts(data);
    if (error) toast.error(error.message);
  }, [data, error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user?.id, ...newPost }),
    });
    if (res.ok) {
      toast.success("Post created!");
      const post = await res.json();
      setPosts([post, ...posts]);
      setNewPost({ title: "", content: "" });
    } else {
      toast.error("Failed to create post");
    }
  };

  if (isLoading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        Community Forum
      </h1>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
      >
        <input
          type="text"
          placeholder="Post Title"
          value={newPost.title}
          onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
          className="w-full rounded-md border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
        />
        <textarea
          placeholder="Post Content"
          value={newPost.content}
          onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
          className="w-full rounded-md border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Create Post
        </button>
      </form>
      <div className="space-y-4">
        {posts.map((post) => (
          <div
            key={post.id}
            className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
          >
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              {post.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {post.content}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Posted by {post.users.name} on{" "}
              {new Date(post.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
