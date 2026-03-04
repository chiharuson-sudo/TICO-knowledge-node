"use client";

import { useEffect, useRef } from "react";
import { supabase } from "./supabase";
import { fetchKnowledgeFromSupabase, fetchRelationsFromSupabase } from "./data-supabase";
import type { Knowledge, Relation } from "./types";

const KNOWLEDGE_TABLE = "knowledge";
const RELATIONS_TABLE = "relations";

/**
 * Supabase のナレッジ・関係を購読し、変更時に onData を呼ぶ（全員にグラフ変更が反映される）
 */
export function useSupabaseSync(
  onData: (knowledge: Knowledge[], relations: Relation[]) => void
) {
  const onDataRef = useRef(onData);
  onDataRef.current = onData;

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    const refetch = async () => {
      const [knowledge, relations] = await Promise.all([
        fetchKnowledgeFromSupabase(),
        fetchRelationsFromSupabase(),
      ]);
      if (knowledge && relations) onDataRef.current(knowledge, relations);
    };

    const channel = client
      .channel("knowledge-graph-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: KNOWLEDGE_TABLE },
        () => {
          void refetch();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: RELATIONS_TABLE },
        () => {
          void refetch();
        }
      )
      .subscribe();

    void refetch();

    return () => {
      void client.removeChannel(channel);
    };
  }, []);
}
