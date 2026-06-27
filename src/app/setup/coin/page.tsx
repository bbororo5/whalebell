"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageShell, StepIndicator } from "@/components/page-shell";
import { CoinCard } from "@/components/coin-card";
import { Button } from "@/components/ui/button";
import { useStoredPhone } from "@/components/phone-gate";
import { getPopularCoins, searchCoins } from "@/lib/coins";
import {
  coinSubscriptionState,
  fetchSubscriptions,
  patchSubscription,
  subscriptionsBySymbol,
} from "@/lib/subscriptions-client";
import { useSetupStore } from "@/lib/store";
import type { Subscription } from "@/lib/types";

export default function CoinSelectPage() {
  const router = useRouter();
  const setCoin = useSetupStore((s) => s.setCoin);
  const selected = useSetupStore((s) => s.coinSymbol);
  const setupPhone = useSetupStore((s) => s.phone);
  const { phone: storedPhone } = useStoredPhone();

  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [subs, setSubs] = useState<Subscription[]>([]);

  const phone = storedPhone || setupPhone;

  const loadSubs = useCallback(async (p: string) => {
    setSubs(await fetchSubscriptions(p));
  }, []);

  useEffect(() => {
    if (phone.replace(/[^0-9]/g, "").length >= 10) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadSubs(phone);
    }
  }, [phone, loadSubs]);

  const subBySymbol = useMemo(() => subscriptionsBySymbol(subs), [subs]);

  const activeCount = useMemo(
    () => subs.filter((s) => s.active).length,
    [subs],
  );

  const popular = useMemo(() => getPopularCoins(), []);
  const results = useMemo(() => searchCoins(query), [query]);

  function handleSelect(symbol: string) {
    if (coinSubscriptionState(subs, symbol) === "active") return;
    setCoin(symbol);
    router.push("/setup/threshold");
  }

  async function handleDisable(symbol: string) {
    const sub = subBySymbol.get(symbol.toUpperCase());
    if (!sub) return;
    await patchSubscription(sub.id, { active: false });
    if (phone) await loadSubs(phone);
  }

  async function handleEnable(symbol: string) {
    const sub = subBySymbol.get(symbol.toUpperCase());
    if (!sub) return;
    await patchSubscription(sub.id, { active: true });
    if (phone) await loadSubs(phone);
  }

  function renderCard(coin: (typeof popular)[number]) {
    const state = coinSubscriptionState(subs, coin.symbol);
    return (
      <CoinCard
        key={coin.symbol}
        coin={coin}
        subscriptionState={state}
        selected={state === "none" && selected === coin.symbol}
        onSelect={handleSelect}
        onEnable={handleEnable}
        onDisable={handleDisable}
      />
    );
  }

  return (
    <PageShell>
      <StepIndicator current={1} />

      <h1 className="text-3xl font-extrabold leading-snug">
        어떤 코인 알림을
        <br />
        받을까요?
      </h1>
      <p className="mt-4 text-xl leading-relaxed text-slate-600">
        가지고 있거나 관심 있는 코인을 선택해주세요. 큰손 계좌의 큰 이동이
        생기면 문자로 알려드립니다.
      </p>
      {subs.length > 0 && (
        <p className="mt-3 text-base text-slate-600">
          알림 받는 코인은 <b>알림 끄기</b>로 잠시 멈출 수 있어요. 꺼둔 코인은{" "}
          <b>다시 알림 받기</b>로 바로 켤 수 있어요.
        </p>
      )}

      <h2 className="mt-8 mb-3 text-2xl font-extrabold">많이 선택하는 코인</h2>
      <div className="flex flex-col gap-4">{popular.map(renderCard)}</div>

      <div className="mt-10 rounded-3xl border-2 border-dashed border-border p-5 text-center">
        <p className="text-xl font-bold">찾는 코인이 없나요?</p>
        <p className="mt-1 text-base text-slate-600">
          코인 이름이나 영문 약자를 입력해보세요.
        </p>
        {!showSearch && (
          <Button
            variant="outline"
            block
            className="mt-4"
            onClick={() => setShowSearch(true)}
          >
            코인 이름 검색하기
          </Button>
        )}
      </div>

      {showSearch && (
        <div className="mt-6">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예: 비트코인, BTC, 월드코인, WLD"
            className="h-16 w-full rounded-2xl border-2 border-border bg-white px-5 text-xl outline-none focus:border-primary focus:ring-4 focus:ring-primary/20"
          />
          <div className="mt-4 flex flex-col gap-4">
            {results.length === 0 ? (
              <p className="py-6 text-center text-lg text-muted">
                그런 이름의 코인을 찾지 못했어요.
              </p>
            ) : (
              results.map(renderCard)
            )}
          </div>
        </div>
      )}

      {activeCount > 0 && (
        <Link href="/dashboard" className="mt-8 block">
          <Button variant="secondary" block>
            내 알림 확인하기
          </Button>
        </Link>
      )}
    </PageShell>
  );
}
