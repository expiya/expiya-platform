"use client";

import { useEffect } from "react";

export function LegacyConversationForwarder({ destination }: { readonly destination: string }) {
  useEffect(() => {
    const match = /^#conversation=([a-f0-9-]{36})$/iu.exec(window.location.hash);
    if (match) window.location.replace(`${destination}#conversation=${match[1]}`);
  }, [destination]);
  const safeDestination = JSON.stringify(destination).replaceAll("<", "\\u003c");
  return <script dangerouslySetInnerHTML={{ __html: `(function(){var m=/^#conversation=([a-f0-9-]{36})$/i.exec(location.hash);if(m)location.replace(${safeDestination}+'#conversation='+m[1])})()` }}/>;
}
