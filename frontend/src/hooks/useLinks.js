import { useState, useEffect } from "react";
import { linksApi } from "../services/api";

export function useLinks() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  // Fetch links from backend whenever page changes (server-side pagination)
  useEffect(() => {
    setLoading(true);
    linksApi.getMyLinks(page, limit)
      .then((data) => {
        // backend returns { total, page, limit, links }
        if (data && Array.isArray(data.links)) {
          setLinks(data.links);
          if (typeof data.total === "number") setTotal(data.total);
        } else {
          // Fallback if backend ever returns a bare list
          setLinks(data || []);
          setTotal(Array.isArray(data) ? data.length : 0);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, limit]);

  // Optimistic toggle — update UI immediately, call API, revert on failure
  const toggleStatus = async (id, currentStatus) => {
    const isActive = currentStatus === "active";

    // Optimistic update
    setLinks((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, status: isActive ? "disabled" : "active" } : l
      )
    );

    try {
      const link = links.find((l) => l.id === id);
      if (isActive) {
        await linksApi.disable(link.short_code);
      } else {
        await linksApi.enable(link.short_code);
      }
    } catch (err) {
      // Revert on failure
      setLinks((prev) =>
        prev.map((l) =>
          l.id === id ? { ...l, status: currentStatus } : l
        )
      );
      throw err;
    }
  };

  // Call API then prepend the returned link to the list
  const createLink = async ({ url, customCode, expiry }) => {
    const newLink = await linksApi.shorten(
      url,
      customCode || null,
      expiry || null
    );
    // backend URLResponse doesn't include status/clicks; assume new links are active with 0 clicks
    const shaped = {
      clicks: 0,
      status: "active",
      ...newLink,
    };
    // prepend to current page for immediate UI update and bump total
    setLinks((prev) => [shaped, ...prev]);
    setTotal((prev) => prev + 1);
    return shaped;
  };

  return { links, loading, error, page, setPage, limit, total, toggleStatus, createLink };
}