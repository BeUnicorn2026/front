import React, { useCallback, useEffect, useRef, useState } from "react";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Section } from "@astryxdesign/core/Section";
import { Stack } from "@astryxdesign/core/Stack";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { apiRequest, postJson } from "../../api";

const won = new Intl.NumberFormat("ko-KR");

function PlanCard({ plan, currentPlanId, paymentEnabled, busyPlan, onSelect }) {
  const current = plan.id === currentPlanId;
  const paid = plan.amount > 0;
  const recommended = plan.id === "PRO";
  return (
    <Card padding={6} variant={recommended ? "teal" : "default"} elevation={recommended ? "low" : "none"} height="100%">
      <Stack gap={6} height="100%" justify="between">
        <Stack gap={5}>
          <Stack gap={2}>
            <Stack direction="horizontal" justify="between" align="center" gap={2}>
              <Heading level={2}>{plan.name}</Heading>
              {current ? <Token label="현재 플랜" color="teal" size="sm" /> : recommended ? <Token label="추천" color="teal" size="sm" /> : null}
            </Stack>
            <Text color="secondary" as="p">{plan.description}</Text>
          </Stack>
          <Stack direction="horizontal" align="end" gap={2}>
            <Heading level={1}>{paid ? `${won.format(plan.amount)}원` : "무료"}</Heading>
            {paid && <Text color="secondary">/ 30일</Text>}
          </Stack>
          <Stack gap={3}>
            {plan.features.map((feature) => (
              <Stack key={feature} direction="horizontal" gap={2} align="start">
                <Icon icon="check" color="success" />
                <Text>{feature}</Text>
              </Stack>
            ))}
          </Stack>
        </Stack>
        <Button
          label={current ? "이용 중" : paid ? `${plan.name} 선택` : "기본 플랜"}
          variant={recommended && !current ? "primary" : "secondary"}
          width="100%"
          isDisabled={current || !paid || !paymentEnabled}
          isLoading={busyPlan === plan.id}
          onClick={() => onSelect(plan)}
        />
      </Stack>
    </Card>
  );
}

export function BillingPage({ context, onBillingChange }) {
  const [billing, setBilling] = useState(null);
  const [busyPlan, setBusyPlan] = useState("");
  const [feedback, setFeedback] = useState(null);
  const confirmationStarted = useRef(false);

  const loadBilling = useCallback(async () => {
    const result = await apiRequest("/api/billing");
    setBilling(result);
    onBillingChange?.(result);
    return result;
  }, [onBillingChange]);

  useEffect(() => {
    let cancelled = false;
    loadBilling().catch((error) => {
      if (!cancelled) setFeedback({ status: "error", message: error.message });
    });
    return () => { cancelled = true; };
  }, [loadBilling]);

  useEffect(() => {
    if (confirmationStarted.current || window.location.pathname !== "/billing/success") return;
    confirmationStarted.current = true;
    const query = new URLSearchParams(window.location.search);
    const paymentKey = query.get("paymentKey");
    const orderId = query.get("orderId");
    const amount = Number(query.get("amount"));
    if (!paymentKey || !orderId || !Number.isSafeInteger(amount)) {
      setFeedback({ status: "error", message: "결제 승인 정보가 올바르지 않습니다." });
      window.history.replaceState({}, "", "/billing");
      return;
    }
    setBusyPlan("confirming");
    postJson("/api/billing/confirm", { paymentKey, orderId, amount })
      .then(async () => {
        await loadBilling();
        setFeedback({ status: "success", message: "결제가 승인되어 새 플랜이 적용됐습니다." });
      })
      .catch((error) => setFeedback({ status: "error", message: error.message }))
      .finally(() => {
        setBusyPlan("");
        window.history.replaceState({}, "", "/billing");
      });
  }, [loadBilling]);

  useEffect(() => {
    if (window.location.pathname !== "/billing/fail") return;
    const query = new URLSearchParams(window.location.search);
    const code = String(query.get("code") || "PAYMENT_FAILED").slice(0, 80);
    setFeedback({
      status: code === "PAY_PROCESS_CANCELED" ? "info" : "error",
      message: code === "PAY_PROCESS_CANCELED" ? "결제를 취소했습니다. 플랜은 변경되지 않았습니다." : "결제를 완료하지 못했습니다. 다시 시도해 주세요."
    });
    window.history.replaceState({}, "", "/billing");
  }, []);

  const selectPlan = async (plan) => {
    if (!billing?.payment?.enabled || !plan?.amount) return;
    setBusyPlan(plan.id);
    setFeedback(null);
    try {
      const order = await postJson("/api/billing/orders", { planId: plan.id });
      const tossPayments = await loadTossPayments(billing.payment.clientKey);
      const payment = tossPayments.payment({ customerKey: context.user.id });
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: order.amount },
        orderId: order.orderId,
        orderName: order.orderName,
        successUrl: `${window.location.origin}/billing/success`,
        failUrl: `${window.location.origin}/billing/fail`,
        customerEmail: context.user.email,
        customerName: context.user.name,
        card: { useEscrow: false, flowMode: "DEFAULT", useCardPoint: false, useAppCardOnly: false }
      });
    } catch (error) {
      setFeedback({ status: "error", message: error.message || "결제창을 열지 못했습니다." });
      setBusyPlan("");
    }
  };

  const subscription = billing?.subscription || { planId: "FREE" };
  const meetingUsage = billing?.usage?.meetings;
  const speakerUsage = billing?.usage?.speakers;
  const durationHours = billing?.entitlements?.meetingDurationSeconds
    ? billing.entitlements.meetingDurationSeconds / 3600
    : 0;
  return (
    <Layout
      contentWidth={1040}
      header={(
        <LayoutHeader height="calc(var(--spacing-10) * 3)" style={{ background: "var(--color-background-surface)", paddingInline: "var(--spacing-3)" }}>
          <Stack gap={1}>
            <Heading level={1} type="display-3">플랜과 사용량</Heading>
            <Text color="secondary">팀에 맞는 회의 기록 용량과 개인화 기능을 선택하세요.</Text>
          </Stack>
        </LayoutHeader>
      )}
      content={(
        <LayoutContent padding={6}>
          <Stack gap={6}>
            {feedback && <Banner status={feedback.status} title={feedback.message} isDismissable onDismiss={() => setFeedback(null)} />}
            {billing && (
              <Section variant="muted" padding={4}>
                <Stack gap={4}>
                  <Stack direction="horizontal" justify="between" align="center">
                    <Heading level={2}>현재 사용량</Heading>
                    <Text type="supporting" color="secondary">{new Date(billing.usage.periodStart).toLocaleDateString("ko-KR")}부터</Text>
                  </Stack>
                  <Grid columns={{ minWidth: 240, max: 3, repeat: "fit" }} gap={4}>
                    <Stack gap={2}>
                      <Text color="secondary">회의</Text>
                      <Heading level={2}>{meetingUsage?.used || 0}{meetingUsage?.limit == null ? "회" : ` / ${meetingUsage.limit}회`}</Heading>
                      {meetingUsage?.limit != null && <ProgressBar label="회의 사용량" value={Math.min(100, Math.round((meetingUsage.used / meetingUsage.limit) * 100))} isLabelHidden />}
                    </Stack>
                    <Stack gap={2}>
                      <Text color="secondary">회의당 최대 시간</Text>
                      <Heading level={2}>{durationHours < 1 ? `${Math.round(durationHours * 60)}분` : `${durationHours}시간`}</Heading>
                      <Text type="supporting">실시간 기록과 파일 전사에 적용</Text>
                    </Stack>
                    <Stack gap={2}>
                      <Text color="secondary">등록 목소리</Text>
                      <Heading level={2}>{speakerUsage?.used || 0} / {speakerUsage?.limit || 0}명</Heading>
                      <ProgressBar label="화자 프로필 사용량" value={speakerUsage?.limit ? Math.min(100, Math.round((speakerUsage.used / speakerUsage.limit) * 100)) : 0} isLabelHidden />
                    </Stack>
                  </Grid>
                </Stack>
              </Section>
            )}
            <Section padding={0}>
              <Grid columns={{ minWidth: 260, max: 3, repeat: "fit" }} gap={4}>
                {(billing?.plans || []).map((plan) => (
                  <PlanCard key={plan.id} plan={plan} currentPlanId={subscription.planId} paymentEnabled={billing.payment.enabled} busyPlan={busyPlan} onSelect={selectPlan} />
                ))}
              </Grid>
            </Section>
            <Stack gap={2} align="center">
              <StatusDot variant={subscription.planId === "FREE" ? "neutral" : "success"} label={`${subscription.planId} 플랜 이용 중`} />
              {subscription.currentPeriodEnd && <Text type="supporting">{new Date(subscription.currentPeriodEnd).toLocaleDateString("ko-KR")}까지 이용할 수 있습니다.</Text>}
              <Text type="supporting">유료 플랜은 결제일부터 30일간 적용되며 현재 버전에서는 직접 갱신합니다.</Text>
            </Stack>
          </Stack>
        </LayoutContent>
      )}
    />
  );
}
