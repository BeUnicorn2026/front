import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { FileInput } from "@astryxdesign/core/FileInput";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { Layout, LayoutContent, LayoutFooter, LayoutHeader, LayoutPanel } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { Section } from "@astryxdesign/core/Section";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { SideNav, SideNavHeading, SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { Stack } from "@astryxdesign/core/Stack";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Token } from "@astryxdesign/core/Token";
import { Toolbar } from "@astryxdesign/core/Toolbar";
import { TreeList } from "@astryxdesign/core/TreeList";
import { apiRequest, postJson, putJson } from "./api";
import {
  ROLE_OPTIONS, buildAnalyzedStructure, buildMeetingStructure, buildStructureBlocks,
  deriveActions, deriveTerms, formatTime, matchingTerms, meetingStatusPresentation
} from "./data/intelligence";
import { useRecording } from "./features/recording/useRecording";

function useViewport() {
  const [viewport, setViewport] = useState(() => ({
    compact: window.matchMedia("(max-width: 767px)").matches,
    desktop: window.matchMedia("(min-width: 1180px)").matches,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches
  }));
  useEffect(() => {
    const compact = window.matchMedia("(max-width: 767px)");
    const desktop = window.matchMedia("(min-width: 1180px)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setViewport({
      compact: compact.matches,
      desktop: desktop.matches,
      reducedMotion: reducedMotion.matches
    });
    compact.addEventListener("change", update);
    desktop.addEventListener("change", update);
    reducedMotion.addEventListener("change", update);
    return () => {
      compact.removeEventListener("change", update);
      desktop.removeEventListener("change", update);
      reducedMotion.removeEventListener("change", update);
    };
  }, []);
  return viewport;
}

function Feedback({ message, status = "error", onDismiss }) {
  if (!message) return null;
  return <Banner status={status} title={message} isDismissable={Boolean(onDismiss)} onDismiss={onDismiss} />;
}

function BrandStory({ compact = false }) {
  return (
    <Stack gap={compact ? 4 : 8} maxWidth={compact ? "100%" : 540}>
      <Stack direction="horizontal" gap={2} align="center">
        <Card variant="teal" padding={2}>
          <Icon icon="microphone" color="accent" label="Voice Partition" size="lg" />
        </Card>
        <Stack gap={0.5}>
          <Text type="label" weight="semibold">VOICE PARTITION</Text>
          <Text type="supporting">Speaker-aware meeting intelligence</Text>
        </Stack>
      </Stack>
      <Stack gap={3}>
        <Heading level={1} type={compact ? undefined : "display-2"} textWrap="balance">
          대화가 끝나기 전에, 문서는 이미 구조가 됩니다.
        </Heading>
        <Text type="large" color="secondary" as="p">
          등록된 목소리를 실시간으로 확인하고, 회의 흐름을 주제별로 묶고,
          나에게 낯선 용어만 역할에 맞게 설명합니다.
        </Text>
      </Stack>
      <Stack direction="horizontal" gap={2} wrap="wrap">
        <Token label="모르는 용어" color="red" />
        <Token label="조직 신규" color="yellow" />
        <Token label="이미 아는 용어" color="green" />
        <Token label="액션 아이템" color="teal" />
      </Stack>
    </Stack>
  );
}

function AmbientVoiceScene({ compact = false, reducedMotion = false }) {
  const float = (values, duration, begin = "0s") => reducedMotion ? null : (
    <animateTransform
      attributeName="transform"
      type="translate"
      values={values}
      additive="sum"
      dur={duration}
      begin={begin}
      repeatCount="indefinite"
      calcMode="spline"
      keySplines="0.24 1 0.4 1; 0.24 1 0.4 1"
    />
  );

  return (
    <svg
      viewBox="0 0 640 390"
      width="100%"
      height={compact ? 150 : 390}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter id="ambient-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="34" />
        </filter>
        <filter id="ambient-object" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
        <linearGradient id="ambient-sheet" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-background-card)" stopOpacity="0.92" />
          <stop offset="1" stopColor="var(--color-background-surface)" stopOpacity="0.64" />
        </linearGradient>
      </defs>

      <g opacity="0.5" filter="url(#ambient-glow)">
        <circle cx="126" cy="94" r="82" fill="var(--color-background-yellow)" />
        <circle cx="514" cy="82" r="105" fill="var(--color-background-teal)" />
        <circle cx="456" cy="318" r="96" fill="var(--color-background-red)" />
        <circle cx="176" cy="326" r="118" fill="var(--color-accent-muted)" />
      </g>

      <g filter="url(#ambient-object)" opacity="0.95" transform="translate(42 52)">
        {float("0 0; 26 -18; 0 0", "12s")}
        <rect width="224" height="118" rx="28" fill="url(#ambient-sheet)" />
        <circle cx="42" cy="40" r="16" fill="var(--color-accent)" />
        <path d="M82 43h96M82 67h62M30 91h154" stroke="var(--color-text-primary)" strokeWidth="9" strokeLinecap="round" opacity="0.34" />
      </g>

      <g filter="url(#ambient-object)" opacity="0.94" transform="translate(390 35)">
        {float("0 0; -22 24; 0 0", "14s", "-4s")}
        <circle cx="72" cy="72" r="67" fill="var(--color-background-yellow)" />
        <circle cx="72" cy="72" r="31" fill="var(--color-background-teal)" />
        <path d="M72 50v44M54 64v16M90 60v24" stroke="var(--color-accent)" strokeWidth="8" strokeLinecap="round" />
      </g>

      <g filter="url(#ambient-object)" opacity="0.95" transform="translate(304 212)">
        {float("0 0; 18 19; 0 0", "11s", "-7s")}
        <path d="M18 0h176l42 42v122H18z" fill="url(#ambient-sheet)" />
        <path d="M194 0v42h42" fill="var(--color-background-yellow)" />
        <path d="M54 68h118M54 96h146M54 124h92" stroke="var(--color-text-primary)" strokeWidth="10" strokeLinecap="round" opacity="0.28" />
      </g>

      <g filter="url(#ambient-object)" opacity="0.94" transform="translate(102 246)">
        {float("0 0; -15 -22; 0 0", "13s", "-2s")}
        <circle cx="34" cy="34" r="34" fill="var(--color-background-card)" />
        <circle cx="34" cy="34" r="15" fill="var(--color-background-red)" />
        <circle cx="112" cy="54" r="28" fill="var(--color-background-card)" />
        <circle cx="112" cy="54" r="12" fill="var(--color-background-yellow)" />
        <path d="M63 42l22 7" stroke="var(--color-background-card)" strokeWidth="9" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function AuthScreen({ onAuthenticated }) {
  const { compact, desktop, reducedMotion } = useViewport();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [verification, setVerification] = useState(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (verification) {
        const context = await postJson("/api/auth/verify-email", {
          email: verification.email,
          code: verificationCode
        });
        return onAuthenticated(context);
      }
      const context = await postJson(`/api/auth/${mode}`, form);
      if (context.verificationRequired) {
        setVerification(context);
        setVerificationCode(context.developmentCode || "");
        return;
      }
      onAuthenticated(context);
    } catch (requestError) {
      if (requestError.code === "EMAIL_NOT_VERIFIED") {
        setVerification({ email: form.email.trim().toLocaleLowerCase() });
        setVerificationCode("");
        setError("가입할 때 받은 인증 코드를 입력하거나 새 코드를 요청해 주세요.");
        return;
      }
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const resendVerification = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await postJson("/api/auth/verification/resend", {
        email: verification.email,
        password: form.password
      });
      setVerification(result);
      setVerificationCode(result.developmentCode || "");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const resetVerification = (event) => {
    event.preventDefault();
    setVerification(null);
    setVerificationCode("");
    setError("");
  };

  const switchMode = (event) => {
    event.preventDefault();
    setMode((current) => current === "login" ? "signup" : "login");
    setVerification(null);
    setVerificationCode("");
    setError("");
  };

  return (
    <AppShell variant="surface" height="fill" contentPadding={0}>
      <Stack direction={desktop ? "horizontal" : "vertical"} height={desktop ? "100%" : undefined}>
        <Card variant="green" width={desktop ? "54%" : "100%"} height={desktop ? "100%" : undefined} padding={0} elevation="none">
          <Stack height={desktop ? "100%" : undefined} justify="between" padding={compact ? 5 : 10} gap={compact ? 4 : 8}>
            <Stack direction="horizontal" gap={2} align="center">
              <Card variant="transparent" padding={1.5}>
                <Icon icon="microphone" color="accent" label="Voice Partition" size="lg" />
              </Card>
              <Text type="label" weight="semibold">VOICE PARTITION</Text>
            </Stack>
            <Stack gap={3} maxWidth={590}>
              <Text type="label" weight="semibold" color="accent">MEETING INTELLIGENCE</Text>
              <Heading level={1} type={compact ? "display-3" : "display-1"} textWrap="balance">
                말하는 순간, 회의의 맥락이 보입니다.
              </Heading>
              <Text type="large" color="secondary" as="p">
                목소리를 알아보고, 대화를 구조화하고, 나에게 낯선 말만 바로 설명합니다.
              </Text>
            </Stack>
            <AmbientVoiceScene compact={compact} reducedMotion={reducedMotion} />
          </Stack>
        </Card>
        <Section width={desktop ? "46%" : "100%"} padding={compact ? 5 : 10}>
          <Stack height="100%" justify="between" align="center" gap={8}>
            <Stack direction="horizontal" width="100%" maxWidth={440} justify="end">
              <Text type="supporting" color="secondary">보안이 적용된 조직 워크스페이스</Text>
            </Stack>
            <Stack as="form" onSubmit={submit} gap={6} width="100%" maxWidth={440}>
              <Stack gap={1.5}>
                <Text type="label" color="accent" weight="semibold">{verification ? "VERIFY YOUR EMAIL" : mode === "login" ? "WELCOME BACK" : "JOIN YOUR TEAM"}</Text>
                <Heading level={2} type="display-3">{verification ? "이메일을 확인해 주세요" : mode === "login" ? "다시 만나 반가워요" : "일의 맥락을 연결하세요"}</Heading>
                <Text color="secondary" as="p">
                  {verification
                    ? `${verification.email}로 보낸 6자리 코드를 입력하세요. 코드는 10분 동안 유효합니다.`
                    : mode === "login" ? "회사 이메일로 로그인해 이어서 기록하세요." : "계정을 만든 뒤 조직과 개인 용어 지식을 설정합니다."}
                </Text>
              </Stack>
              <Feedback message={error} onDismiss={() => setError("")} />
              {verification ? (
                <Stack gap={4}>
                  {verification.developmentCode && (
                    <Banner status="info" title="개발용 인증 코드" description={`${verification.developmentCode} · 운영 환경에서는 이메일로만 전달됩니다.`} />
                  )}
                  <FormLayout defaultOptionality="required">
                    <TextInput label="인증 코드" value={verificationCode} onChange={(value) => setVerificationCode(value.replace(/\D/g, "").slice(0, 6))} description="숫자 6자리를 입력해 주세요." isRequired width="100%" />
                  </FormLayout>
                  <Button type="submit" variant="primary" size="lg" width="100%" label="이메일 인증" isLoading={busy} isDisabled={verificationCode.length !== 6} />
                  <Button type="button" variant="ghost" size="md" width="100%" label="코드 다시 보내기" onClick={resendVerification} isLoading={busy} />
                  <Text color="secondary" justify="center" display="block" type="supporting">
                    이메일 주소가 다른가요? <Link href="#edit-email" onClick={resetVerification} hasUnderline>다시 입력</Link>
                  </Text>
                </Stack>
              ) : (
                <Stack gap={6}>
                  <FormLayout defaultOptionality="required">
                    {mode === "signup" && (
                      <TextInput label="이름" value={form.name} onChange={(name) => setForm({ ...form, name })} isRequired width="100%" />
                    )}
                    <TextInput type="email" label="회사 이메일" value={form.email} onChange={(email) => setForm({ ...form, email })} isRequired width="100%" />
                    <TextInput type="password" label="비밀번호" value={form.password} onChange={(password) => setForm({ ...form, password })} description="8자 이상 입력해 주세요." isRequired width="100%" />
                  </FormLayout>
                  <Button type="submit" variant="primary" size="lg" width="100%" label={mode === "login" ? "로그인" : "계정 만들기"} isLoading={busy} />
                  <Text color="secondary" justify="center" display="block" type="supporting">
                    {mode === "login" ? "아직 계정이 없나요? " : "이미 계정이 있나요? "}
                    <Link href={mode === "login" ? "#signup" : "#login"} onClick={switchMode} hasUnderline>
                      {mode === "login" ? "회원가입" : "로그인"}
                    </Link>
                  </Text>
                </Stack>
              )}
            </Stack>
            <Text type="supporting" color="secondary" justify="center">
              계속하면 서비스 약관과 개인정보 처리방침에 동의하게 됩니다.
            </Text>
          </Stack>
        </Section>
      </Stack>
    </AppShell>
  );
}

function OrganizationSetup({ context, onChange }) {
  const { compact } = useViewport();
  const [mode, setMode] = useState("create");
  const [name, setName] = useState("");
  const [domain, setDomain] = useState(context.user.email.split("@")[1] || "");
  const [inviteCode, setInviteCode] = useState("");
  const [suggestion, setSuggestion] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiRequest("/api/organizations/suggestion").then(({ suggestion: next }) => setSuggestion(next)).catch(() => undefined);
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const next = mode === "create"
        ? await postJson("/api/organizations", { name, domain })
        : await postJson("/api/organizations/join", { inviteCode });
      onChange(next);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell variant="surface" height="auto" contentPadding={compact ? 3 : 6}>
      <Stack align="center" paddingBlock={compact ? 3 : 8}>
        <Stack width="100%" maxWidth={680} gap={6}>
          <BrandStory compact />
          <Card padding={compact ? 4 : 6}>
            <Stack as="form" onSubmit={submit} gap={5}>
              <Stack gap={1}>
                <Text type="label" color="accent" weight="semibold">STEP 2 OF 3</Text>
                <Heading level={2}>회사를 연결하세요</Heading>
                <Text color="secondary" as="p">회사마다 회의, 구성원, 등록 목소리와 공용 용어 사전이 분리됩니다.</Text>
              </Stack>
              <SegmentedControl value={mode} onChange={setMode} label="조직 설정 방법" layout="fill">
                <SegmentedControlItem value="create" label="새 조직 만들기" />
                <SegmentedControlItem value="join" label="초대 코드로 가입" />
              </SegmentedControl>
              {suggestion?.name && (
                <Banner status="info" title={`${suggestion.name} 조직이 발견됐습니다.`} description="보안을 위해 관리자에게 초대 코드를 요청해 가입하세요." />
              )}
              {!suggestion?.name && suggestion?.domain && (
                <Banner status="info" title={`${suggestion.domain} 도메인`} description="등록된 조직이 없어 새 조직을 만들 수 있습니다." />
              )}
              <Feedback message={error} onDismiss={() => setError("")} />
              {mode === "create" ? (
                <FormLayout defaultOptionality="required">
                  <TextInput label="회사 또는 팀 이름" value={name} onChange={setName} placeholder="예: Acme Product" isRequired width="100%" />
                  <TextInput label="회사 도메인" value={domain} onChange={setDomain} description="도메인은 한 조직에서만 사용할 수 있습니다." isRequired width="100%" />
                </FormLayout>
              ) : (
                <TextInput label="8자리 초대 코드" value={inviteCode} onChange={setInviteCode} placeholder="예: A1B2C3D4" isRequired width="100%" />
              )}
              <Button type="submit" variant="primary" size="lg" width="100%" label={mode === "create" ? "조직 만들기" : "조직에 가입하기"} isLoading={busy} />
            </Stack>
          </Card>
        </Stack>
      </Stack>
    </AppShell>
  );
}

function VocabularyOnboarding({ context, onChange }) {
  const { compact } = useViewport();
  const [roles, setRoles] = useState(context.user.vocabulary?.roles || []);
  const [knownTermsInput, setKnownTermsInput] = useState((context.user.vocabulary?.knownTerms || []).join(", "));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const toggleRole = (value) => setRoles(roles.includes(value) ? roles.filter((item) => item !== value) : [...roles, value]);
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const knownTerms = [...new Set(knownTermsInput.split(/[,\n]/).map((term) => term.trim()).filter(Boolean))];
      onChange(await putJson("/api/profile/vocabulary", { roles, knownTerms, onboarded: true }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell variant="surface" height="auto" contentPadding={compact ? 3 : 6}>
      <Stack align="center" paddingBlock={compact ? 3 : 8}>
        <Stack width="100%" maxWidth={920} gap={6}>
          <Stack gap={2}>
            <Text type="label" color="accent" weight="semibold">STEP 3 OF 3</Text>
            <Heading level={1}>내가 아는 것만 빼고 설명할게요</Heading>
            <Text type="large" color="secondary" as="p">역할과 익숙한 용어를 선택하면 같은 단어도 현재 업무 맥락에 맞춰 풀이합니다.</Text>
            <ProgressBar label="온보딩 진행률" value={100} hasValueLabel />
          </Stack>
          <Feedback message={error} onDismiss={() => setError("")} />
          <Section dividers={["top", "bottom"]}>
            <Stack gap={3}>
              <Stack gap={1}>
                <Heading level={2}>주요 역할</Heading>
                <Text color="secondary">여러 개를 선택해도 됩니다.</Text>
              </Stack>
              <Stack direction="horizontal" gap={2} wrap="wrap">
                {ROLE_OPTIONS.map((role) => (
                  <Token key={role} label={role} color={roles.includes(role) ? "green" : "default"} onClick={() => toggleRole(role)} />
                ))}
              </Stack>
            </Stack>
          </Section>
          <Section>
            <Stack gap={3}>
              <Stack gap={1}>
                <Heading level={2}>이미 익숙한 용어</Heading>
                <Text color="secondary">쉼표로 구분해 입력하세요. 실제 회의에서 다시 등장하면 설명을 접습니다.</Text>
              </Stack>
              <TextInput label="익숙한 용어" value={knownTermsInput} onChange={setKnownTermsInput} placeholder="예: 벡터 검색, 배포 파이프라인" width="100%" />
            </Stack>
          </Section>
          <Stack direction={compact ? "vertical" : "horizontal"} gap={3}>
            {[
              ["낯선 용어", "실제 회의 분석에서 발견되면 내 역할에 맞춰 설명합니다."],
              ["조직 신규", "조직 회의에서 처음 축적된 용어는 별도로 구분합니다."],
              ["이미 아는 용어", "직접 등록했거나 알아요로 표시한 용어는 설명을 접습니다."]
            ].map(([label, description], index) => (
              <Card key={label} variant={index === 0 ? "red" : index === 1 ? "yellow" : "green"} width={compact ? "100%" : "33.333%"} padding={4}>
                <Stack gap={2}>
                  <Token label={label} color={index === 0 ? "red" : index === 1 ? "yellow" : "green"} size="sm" />
                  <Text type="supporting" as="p">{description}</Text>
                </Stack>
              </Card>
            ))}
          </Stack>
          <Stack direction="horizontal" justify="end">
            <Button variant="primary" size="lg" label="설정 저장하고 시작" onClick={submit} isLoading={busy} isDisabled={!roles.length} />
          </Stack>
        </Stack>
      </Stack>
    </AppShell>
  );
}

function PageHeader({ title, endContent }) {
  const { compact } = useViewport();
  const visibleTitle = compact && title.length > 18 ? `${title.slice(0, 18)}…` : title;
  return (
    <LayoutHeader height={64} hasDivider label={`${title} 헤더`}>
      <Toolbar
        label={`${title} 도구`}
        size="lg"
        startContent={(
          <Stack gap={0.5}>
            <Heading level={compact ? 2 : 1} maxLines={1}>{visibleTitle}</Heading>
          </Stack>
        )}
        endContent={endContent}
      />
    </LayoutHeader>
  );
}

function TranscriptList({ segments, speakers = [], onCorrectSpeaker, onCorrectText, compact = false, mode = "speaker", termCatalog = [] }) {
  const identifiesSpeakers = mode === "speaker";
  const [editTarget, setEditTarget] = useState(null);
  const [editText, setEditText] = useState("");
  const [editError, setEditError] = useState("");
  const [isSavingEdit, setSavingEdit] = useState(false);
  const closeEditor = () => {
    if (isSavingEdit) return;
    setEditTarget(null);
    setEditText("");
    setEditError("");
  };
  const saveEdit = async (event) => {
    event.preventDefault();
    const value = editText.trim();
    if (!value) return setEditError("전사 문장을 입력해 주세요.");
    setSavingEdit(true);
    setEditError("");
    try {
      await onCorrectText(editTarget, value);
      setEditTarget(null);
      setEditText("");
    } catch (error) {
      setEditError(error.message || "전사 수정을 저장하지 못했습니다.");
    } finally {
      setSavingEdit(false);
    }
  };
  return (
    <>
      <List
        hasDividers
        density="spacious"
        header={<Heading level={2}>{identifiesSpeakers ? "화자별 실시간 기록" : "실시간 STT 결과"}</Heading>}
      >
        {segments.length ? segments.map((segment, index) => {
          const terms = matchingTerms(segment.text, termCatalog);
          const controls = (
            <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
              <Text type="code" color="secondary">{formatTime(segment.start)}</Text>
              {segment.corrected && <Token label="화자 직접 확인" color="teal" size="sm" />}
              {segment.transcriptCorrected && <Token label="문장 직접 수정" color="teal" size="sm" />}
              {segment.confidence != null && <Token label={`음성 유사도 ${Math.round(segment.confidence * 100)}%`} color={segment.confidence >= 0.78 ? "green" : "yellow"} size="sm" />}
              {segment.transcriptConfidence != null && <Token label={`STT 정확도 ${Math.round(segment.transcriptConfidence * 100)}%`} color={segment.transcriptConfidence >= 0.85 ? "green" : segment.transcriptConfidence >= 0.7 ? "yellow" : "red"} size="sm" />}
              {identifiesSpeakers && onCorrectSpeaker && !segment.pending && (
                <Selector
                  label={`${segment.speaker} 화자 수정`}
                  isLabelHidden
                  size="sm"
                  variant="ghost"
                  value={segment.speaker}
                  onChange={(speaker) => onCorrectSpeaker(segment, speaker)}
                  options={[
                    ...(!speakers.some(({ name }) => name === segment.speaker) ? [{ value: segment.speaker, label: segment.speaker }] : []),
                    ...speakers.map(({ name }) => ({ value: name, label: name }))
                  ]}
                />
              )}
              {onCorrectText && !segment.pending && <Button label="문장 수정" variant="ghost" size="sm" onClick={() => { setEditTarget(segment); setEditText(segment.text); setEditError(""); }} />}
            </Stack>
          );
          return (
            <ListItem
              key={`${segment.start}-${segment.speaker}-${index}`}
              label={segment.speaker}
              startContent={identifiesSpeakers ? <Avatar name={segment.speaker} size="md" /> : <Icon icon="microphone" color="accent" />}
              endContent={compact ? undefined : controls}
              description={(
                <Stack gap={2}>
                  <Text as="p" color={segment.pending ? "secondary" : "primary"}>{segment.text}</Text>
                  {compact && controls}
                  {terms.length > 0 && (
                    <Stack direction="horizontal" gap={1} wrap="wrap">
                      {terms.map(({ term, isKnown }) => <Token key={term} label={term} size="sm" color={isKnown ? "green" : "red"} />)}
                      {segment.pending && <Token label="인식 중" size="sm" />}
                    </Stack>
                  )}
                </Stack>
              )}
            />
          );
        }) : <ListItem label="첫 발화를 기다리는 중" description={identifiesSpeakers ? "녹음이 시작되면 등록된 이름과 발화가 여기에 나타납니다." : "녹음을 시작하면 중간 전사와 확정 전사가 실시간으로 나타납니다."} startContent={<StatusDot variant="accent" label="대기 중" isPulsing />} />}
      </List>
      <Dialog isOpen={Boolean(editTarget)} onOpenChange={(open) => !open && closeEditor()} purpose="required" width={520}>
        <Layout
          header={<DialogHeader title="전사 문장 수정" subtitle={`${editTarget?.speaker || "화자"} · ${formatTime(editTarget?.start || 0)}`} />}
          content={<LayoutContent padding={4}><Stack as="form" id="transcript-edit-form" onSubmit={saveEdit} gap={3}><TextArea label="정확한 문장" value={editText} onChange={setEditText} rows={5} isRequired width="100%" status={editError ? { type: "error", message: editError } : undefined} /><Text type="supporting">수정 내용은 회의 문서와 이후 구조화 결과에 반영됩니다.</Text></Stack></LayoutContent>}
          footer={<LayoutFooter hasDivider><Section padding={3}><Stack direction="horizontal" justify="end" gap={2}><Button label="취소" variant="secondary" onClick={closeEditor} /><Button type="submit" form="transcript-edit-form" label="수정 저장" variant="primary" isLoading={isSavingEdit} /></Stack></Section></LayoutFooter>}
        />
      </Dialog>
    </>
  );
}

function IntelligencePanel({
  terms, actions, roles, onEvidence, onExplain, explanations, onAnswer, busyTerm, busyAnswer
}) {
  const [openedTerms, setOpenedTerms] = useState(() => new Set());
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const openExplanation = (term) => {
    setOpenedTerms((current) => new Set(current).add(term.conceptId || term.term));
    onEvidence(term, "card_open");
  };
  return (
    <Stack gap={4}>
      <Stack gap={1}>
        <Stack direction="horizontal" justify="between" align="center">
          <Heading level={2}>내 이해 패널</Heading>
          <Badge variant="neutral" label={terms.length + actions.length} />
        </Stack>
        <Text type="supporting">{roles.length ? `${roles.join(" · ")} 관점으로 설명 중` : "일반 업무 관점으로 설명 중"}</Text>
      </Stack>
      <Stack gap={4}>
        <List hasDividers header={<Heading level={3}>개인 용어</Heading>}>
          {terms.map((term) => {
            const termKey = term.conceptId || term.term;
            const isOpen = term.shouldExplain || openedTerms.has(term.conceptId || term.term);
            const generated = explanations[termKey];
            const knowledge = term.knowledge;
            const percentage = Math.round((knowledge?.pKnown ?? (term.isKnown ? 1 : 0.35)) * 100);
            const statusLabel = knowledge?.status === "known" ? "이해함" : knowledge?.status === "unknown" ? "설명 필요" : "학습 중";
            const controls = isOpen ? (
              <Stack direction="horizontal" gap={1} wrap="wrap" justify="end">
                <Button label={generated ? "다시 쉽게" : "더 쉽게"} variant="ghost" size="sm" isLoading={busyTerm === term.term} onClick={() => onExplain(term)} />
                <Button
                  label={term.isKnown ? "잘 모르겠어요" : "이제 알아요"}
                  variant="secondary"
                  size="sm"
                  isLoading={busyTerm === term.term}
                  onClick={() => onEvidence(term, term.isKnown ? "mark_unknown" : "mark_known")}
                />
              </Stack>
            ) : <Button label="설명 보기" variant="ghost" size="sm" isDisabled={busyTerm === term.term} onClick={() => openExplanation(term)} />;
            return (
              <ListItem
                key={term.conceptId || term.term}
                label={term.term}
                startContent={<Token label={statusLabel} color={term.isKnown ? "green" : knowledge?.status === "unknown" ? "red" : "yellow"} size="sm" />}
                endContent={controls}
                description={(
                  <Stack gap={2}>
                    <ProgressBar label={`이해 가능성 ${percentage}%`} value={percentage} hasValueLabel />
                    <Text type="supporting">{knowledge?.evidenceCount ? `내 피드백 ${knowledge.evidenceCount}개 기반` : knowledge?.source === "explicit_prior" ? "온보딩에서 직접 등록한 기지식" : "아직 피드백이 없는 초기 추정"}</Text>
                    {isOpen && <Text as="p">{term.personalizedExplanation || term.definition || term.roleHints?.[roles[0]] || "이 용어에 대한 기본 설명을 준비 중입니다."}</Text>}
                    {generated && (
                      <Section variant="muted" padding={3}>
                        <Stack gap={3}>
                          <Stack gap={1}>
                            <Text weight="semibold">나를 위한 쉬운 설명</Text>
                            <Text as="p">{generated.explanation}</Text>
                            {generated.analogy && <Text color="secondary">비유 · {generated.analogy}</Text>}
                          </Stack>
                          <RadioList
                            label={generated.checkQuestion}
                            description="한 번 선택하면 결과가 내 이해 상태에 반영됩니다."
                            value={generated.answer?.choiceIndex == null
                              ? String(selectedAnswers[generated.cacheKey] ?? "")
                              : String(generated.answer.choiceIndex)}
                            onChange={(value) => setSelectedAnswers((current) => ({
                              ...current, [generated.cacheKey]: Number(value)
                            }))}
                            isDisabled={generated.answer?.choiceIndex != null || busyAnswer === generated.cacheKey}
                            size="sm"
                          >
                            {generated.choices.map((choice, index) => (
                              <RadioListItem key={`${generated.cacheKey}-${index}`} label={choice} value={String(index)} />
                            ))}
                          </RadioList>
                          {generated.answer ? (
                            <Banner
                              status={generated.answer.correct ? "success" : "warning"}
                              title={generated.answer.correct ? "정확히 이해했어요." : "한 번 더 확인해 보세요."}
                              description={generated.answer.rationale}
                            />
                          ) : (
                            <Button
                              label="답 확인"
                              variant="secondary"
                              size="sm"
                              isLoading={busyAnswer === generated.cacheKey}
                              isDisabled={!Number.isInteger(selectedAnswers[generated.cacheKey])}
                              onClick={() => onAnswer(generated, selectedAnswers[generated.cacheKey])}
                            />
                          )}
                        </Stack>
                      </Section>
                    )}
                  </Stack>
                )}
              />
            );
          })}
          {!terms.length && <ListItem label="감지된 개인 용어가 없습니다" description="회의 분석에서 실제 전문용어가 발견되면 이해 상태와 함께 표시됩니다." startContent={<Icon icon="info" color="secondary" />} />}
        </List>
        <List hasDividers header={<Heading level={3}>액션 아이템</Heading>}>
          {actions.map((action) => (
            <ListItem key={action.id} label={action.text} description={`담당 · ${action.owner}`} startContent={<Token label="할 일" color="teal" size="sm" />} endContent={<Text type="code" color="secondary">{action.due}</Text>} />
          ))}
          {!actions.length && <ListItem label="감지된 액션이 없습니다" description="담당이나 기한이 실제 발화로 확인되면 여기에 표시됩니다." startContent={<Icon icon="info" color="secondary" />} />}
        </List>
        {!terms.length && !actions.length && (
          <Banner status="info" title="회의 이해 정보가 아직 없습니다." description="용어나 할 일이 감지되면 발화 옆과 이 패널에 함께 표시됩니다." />
        )}
      </Stack>
    </Stack>
  );
}

function MeetingOverview({ segments, mode = "speaker", intelligence, terms, actions }) {
  const speakerCount = new Set(segments.map(({ speaker }) => speaker)).size;
  const termCount = terms.length;
  const actionCount = actions.length;
  return (
    <Stack gap={4}>
      {intelligence?.summary && (
        <Section variant="muted" padding={4}>
          <Stack gap={2}>
            <Heading level={2}>{intelligence.title}</Heading>
            <Text as="p">{intelligence.summary}</Text>
          </Stack>
        </Section>
      )}
      <Stack direction="horizontal" gap={3} wrap="wrap">
        {[
          [mode === "speaker" ? "화자" : "전사 구간", mode === "speaker" ? speakerCount : segments.length, mode === "speaker" ? "등록 목소리와 실시간 대조" : "Nova-3 실시간 확정 결과"],
          ["낯선 용어", termCount, "개인 지식 기준으로 분류"],
          ["액션", actionCount, "실제 발화 근거로 추출"]
        ].map(([label, value, description]) => (
          <Card key={label} width={240} padding={4}>
            <Stack gap={1}>
              <Text type="supporting">{label}</Text>
              <Heading level={2} type="display-3">{value}</Heading>
              <Text type="supporting">{description}</Text>
            </Stack>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}

function TopicEvidence({ block }) {
  if (!block) return null;
  return (
    <Card padding={4} variant="muted">
      <Stack gap={3}>
        <Stack direction="horizontal" justify="between" align="center" gap={2} wrap="wrap">
          <Stack gap={0.5}>
            <Text type="label" color="accent">선택한 주제</Text>
            <Heading level={2}>{block.label}</Heading>
          </Stack>
          <Text type="code" color="secondary">{formatTime(block.start)}–{formatTime(block.end)}</Text>
        </Stack>
        {block.summary && <Text as="p">{block.summary}</Text>}
        <Stack direction="horizontal" gap={1} wrap="wrap">
          {(block.speakers || []).map((speaker) => <Token key={speaker} label={speaker} size="sm" />)}
        </Stack>
        <List hasDividers density="compact" header={<Heading level={3}>근거 발화 {block.segments.length}개</Heading>}>
          {block.segments.map((segment, index) => <ListItem key={`${block.id}-evidence-${index}`} label={`${segment.speaker} · ${formatTime(segment.start)}`} description={segment.text} />)}
        </List>
      </Stack>
    </Card>
  );
}

function StructureDiagram({ blocks, selectedId, onSelect }) {
  if (!blocks.length) {
    return <Banner status="info" title="아직 구조화할 발화가 없습니다." description="녹음을 시작하면 실제 대화 순서대로 구간이 만들어집니다." />;
  }
  return (
    <Stack gap={4}>
      <Stack direction="horizontal" gap={3} wrap="wrap" align="stretch">
        {blocks.map((block, index) => (
        <Card key={block.id} width={260} padding={4} variant={selectedId === block.id ? "teal" : "default"} elevation={selectedId === block.id ? "sm" : "none"}>
          <Stack gap={3}>
            <Stack direction="horizontal" justify="between" align="center">
              <Token label={`구간 ${index + 1}`} color={selectedId === block.id ? "teal" : "default"} size="sm" />
              <Text type="code" color="secondary">{formatTime(block.start)}–{formatTime(block.end)}</Text>
            </Stack>
            <Heading level={3}>{block.label}</Heading>
            <Stack direction="horizontal" gap={1} wrap="wrap">
              {block.speakers.map((speaker) => <Token key={speaker} label={speaker} size="sm" />)}
            </Stack>
            <Text type="supporting">실제 발화 {block.segments.length}개</Text>
            <Button label={selectedId === block.id ? "근거 표시 중" : "근거 보기"} variant={selectedId === block.id ? "secondary" : "ghost"} size="sm" onClick={() => onSelect(block.id)} />
          </Stack>
        </Card>
        ))}
      </Stack>
      <TopicEvidence block={blocks.find(({ id }) => id === selectedId)} />
    </Stack>
  );
}

function MeetingMindMap({ blocks, compact, selectedId, onSelect }) {
  if (!blocks.length) {
    return <Banner status="info" title="첫 발화를 기다리는 중" description="대화가 들어오면 중심 주제와 발화 구간이 연결됩니다." />;
  }
  const selectedIndex = Math.max(0, blocks.findIndex(({ id }) => id === selectedId));
  const windowStart = Math.max(0, Math.min(selectedIndex - 7, blocks.length - 16));
  const visible = blocks.slice(windowStart, windowStart + 16);
  const centerX = 420;
  const centerY = 310;
  const radiusX = 325;
  const radiusY = 245;
  const nodes = visible.map((block, index) => {
    const angle = ((Math.PI * 2) / visible.length) * index - Math.PI / 2;
    return { ...block, x: centerX + Math.cos(angle) * radiusX, y: centerY + Math.sin(angle) * radiusY };
  });
  return (
    <Stack gap={4}>
      <Stack direction={compact ? "vertical" : "horizontal"} justify="between" align={compact ? "stretch" : "center"} gap={2}>
        <Stack gap={0.5}>
          <Heading level={2}>회의 마인드맵</Heading>
          <Text color="secondary">주제 {selectedIndex + 1}/{blocks.length} · 방향 버튼과 노드를 모두 사용할 수 있습니다.</Text>
        </Stack>
        <Stack direction="horizontal" gap={2} justify="end">
          <Button label="이전 주제" variant="secondary" size="sm" isDisabled={selectedIndex <= 0} onClick={() => onSelect(blocks[selectedIndex - 1]?.id)} />
          <Button label="다음 주제" variant="secondary" size="sm" isDisabled={selectedIndex >= blocks.length - 1} onClick={() => onSelect(blocks[selectedIndex + 1]?.id)} />
        </Stack>
      </Stack>
      {blocks.length > visible.length && (
        <Banner status="info" title={`전체 ${blocks.length}개 중 선택 주제 주변 ${visible.length}개를 표시합니다.`} description="이전·다음 주제로 이동하면 마인드맵 표시 범위도 함께 이동합니다. 트리 보기에서는 전체 계층을 한 번에 탐색할 수 있습니다." />
      )}
      <Card variant="muted" padding={compact ? 1 : 3}>
      <svg viewBox="0 0 840 620" width="100%" height={compact ? 420 : 560} role="img" aria-label={`전체 ${blocks.length}개 중 ${visible.length}개 주제를 표시한 실제 회의 마인드맵`}>
        <title>실제 회의 마인드맵</title>
        {nodes.map((node) => (
          <line key={`line-${node.id}`} x1={centerX} y1={centerY} x2={node.x} y2={node.y} stroke="var(--color-border-emphasized)" strokeWidth="2" />
        ))}
        <g>
          <rect x="342" y="274" width="156" height="72" rx="24" fill="var(--color-accent)" />
          <text x={centerX} y="305" textAnchor="middle" fill="var(--color-on-accent)" fontSize="var(--font-size-lg)" fontWeight="var(--font-weight-semibold)">현재 회의</text>
          <text x={centerX} y="329" textAnchor="middle" fill="var(--color-on-accent)" fontSize="var(--font-size-sm)">{blocks.reduce((sum, block) => sum + block.segments.length, 0)}개 실제 발화</text>
        </g>
        {nodes.map((node) => (
          <g
            key={node.id}
            role="button"
            tabIndex={0}
            cursor="pointer"
            aria-label={`${node.label} 주제 열기`}
            aria-pressed={selectedId === node.id}
            onClick={() => onSelect(node.id)}
            onFocus={() => onSelect(node.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(node.id);
              }
            }}
          >
            <rect x={node.x - 66} y={node.y - 30} width="132" height="60" rx="18" fill="var(--color-background-card)" stroke={selectedId === node.id ? "var(--color-accent)" : "var(--color-border)"} strokeWidth={selectedId === node.id ? "4" : "2"} />
            <text x={node.x} y={node.y - 3} textAnchor="middle" fill="var(--color-text-primary)" fontSize="var(--font-size-base)" fontWeight="var(--font-weight-semibold)">
              {node.label.length > 15 ? `${node.label.slice(0, 15)}…` : node.label}
            </text>
            <text x={node.x} y={node.y + 18} textAnchor="middle" fill="var(--color-text-secondary)" fontSize="var(--font-size-sm)">
              {formatTime(node.start)} · {node.segments.length}개 발화
            </text>
          </g>
        ))}
      </svg>
      </Card>
      <TopicEvidence block={blocks.find(({ id }) => id === selectedId)} />
    </Stack>
  );
}

function RecordingFooter({ recording, compact }) {
  const identifiesSpeakers = recording.mode === "speaker";
  return (
    <LayoutFooter hasDivider label="녹음 컨트롤">
      <Section variant="muted" padding={3}>
        <Stack gap={3}>
          <Stack direction={compact ? "vertical" : "horizontal"} gap={2} align={compact ? "stretch" : "center"} justify="between">
            <Stack gap={0.5}>
              <Text weight="semibold">기록 모드</Text>
              <Text type="supporting">{identifiesSpeakers ? "등록된 목소리와 실시간 발화를 함께 대조합니다." : "화자 등록 없이 Nova-3 전사 정확도와 반응을 확인합니다."}</Text>
            </Stack>
            <SegmentedControl value={recording.mode} onChange={recording.setMode} label="실시간 기록 모드" size="sm" layout={compact ? "fill" : "hug"} isDisabled={recording.isRecording || recording.isBusy} disabledMessage="기록 중에는 모드를 바꿀 수 없습니다.">
              <SegmentedControlItem value="stt" label="빠른 STT 테스트" />
              <SegmentedControlItem value="speaker" label="화자 식별 회의" />
            </SegmentedControl>
          </Stack>
          <Stack direction={compact ? "vertical" : "horizontal"} gap={3} align={compact ? "stretch" : "center"} justify="between">
            <Stack direction="horizontal" gap={2} align="center">
              <StatusDot variant={recording.isRecording ? "error" : "accent"} label={recording.status} isPulsing={recording.isRecording} />
              <Stack gap={0.5}>
                <Text weight="semibold">{recording.status}</Text>
                <Text type="code" color="secondary">{formatTime(recording.elapsed)}</Text>
              </Stack>
            </Stack>
            <Stack width={compact ? "100%" : 180}>
              <ProgressBar label="마이크 입력 레벨" value={recording.audioLevel} isLabelHidden variant={recording.isRecording ? "error" : "neutral"} />
            </Stack>
            {identifiesSpeakers && <FileInput
              label="녹음 파일 전사"
              value={null}
              onChange={(file) => file && recording.transcribeFile(file)}
              accept="audio/*,video/mp4,video/webm"
              placeholder="파일에서 전사"
              isLabelHidden
              isLoading={recording.isBusy && !recording.isRecording}
              isDisabled={recording.isRecording || !recording.services.openai}
              disabledMessage={recording.isRecording ? "기록 중에는 파일을 올릴 수 없습니다." : "서버에 OpenAI 전사 키가 설정되어 있지 않습니다."}
              width={compact ? "100%" : 220}
            />}
            <Button
              variant="primary"
              size="lg"
              label={recording.isRecording ? "기록 중지" : identifiesSpeakers ? "화자 식별 시작" : "STT 테스트 시작"}
              icon={<Icon icon={recording.isRecording ? "stop" : "microphone"} />}
              onClick={recording.isRecording ? recording.stop : recording.start}
              isLoading={recording.isBusy}
              width={compact ? "100%" : undefined}
            />
          </Stack>
        </Stack>
      </Section>
    </LayoutFooter>
  );
}

function MeetingPage({ context, recording, vocabularyTerms, onVocabularyRefresh }) {
  const { compact, desktop } = useViewport();
  const [view, setView] = useState("outline");
  const [isInsightOpen, setInsightOpen] = useState(false);
  const [intelligence, setIntelligence] = useState(null);
  const [intelligenceBusy, setIntelligenceBusy] = useState(false);
  const [intelligenceNotice, setIntelligenceNotice] = useState("");
  const [knowledgeBusyTerm, setKnowledgeBusyTerm] = useState("");
  const [knowledgeAnswerBusy, setKnowledgeAnswerBusy] = useState("");
  const [knowledgeExplanations, setKnowledgeExplanations] = useState({});
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const displayedSegments = recording.segments;
  const knownTerms = context.user.vocabulary?.knownTerms || [];
  const localTerms = useMemo(() => deriveTerms(displayedSegments, knownTerms, vocabularyTerms), [displayedSegments, knownTerms, vocabularyTerms]);
  const localActions = useMemo(() => deriveActions(displayedSegments), [displayedSegments]);
  const localTree = useMemo(() => buildMeetingStructure(displayedSegments), [displayedSegments]);
  const localBlocks = useMemo(() => buildStructureBlocks(displayedSegments), [displayedSegments]);
  const analyzedStructure = useMemo(() => buildAnalyzedStructure(intelligence, displayedSegments), [displayedSegments, intelligence]);
  const terms = useMemo(() => intelligence?.terms || localTerms, [intelligence, localTerms]);
  const actions = intelligence?.actions || localActions;
  const blocks = analyzedStructure.blocks.length ? analyzedStructure.blocks : localBlocks;
  const tree = useMemo(() => analyzedStructure.tree.length ? analyzedStructure.tree.map((root) => ({
    ...root,
    children: (root.children || []).map((block) => ({ ...block, onClick: () => setSelectedBlockId(block.id) }))
  })) : localTree.map((root) => ({
    ...root,
    children: (root.children || []).map((block) => ({ ...block, onClick: () => setSelectedBlockId(block.id) }))
  })), [analyzedStructure.tree, localTree]);
  const identifiesSpeakers = recording.mode === "speaker";
  const unverifiedSpeakerCount = recording.speakers.filter((speaker) => !speaker.crossSessionVerificationCount).length;
  const visibleNotice = !identifiesSpeakers && recording.notice.includes("목소리를 한 명 이상 등록") ? "" : recording.notice;

  useEffect(() => {
    if (!blocks.length) return setSelectedBlockId(null);
    if (!blocks.some(({ id }) => id === selectedBlockId)) setSelectedBlockId(blocks[0].id);
  }, [blocks, selectedBlockId]);

  useEffect(() => {
    const meeting = recording.activeMeeting;
    let cancelled = false;
    setIntelligenceNotice("");
    if (!meeting?.id || meeting.status === "recording" || !displayedSegments.length) {
      setIntelligence(null);
      return () => { cancelled = true; };
    }
    apiRequest(`/api/meetings/${meeting.id}/intelligence`)
      .then(({ intelligence: cached }) => { if (!cancelled) setIntelligence(cached); })
      .catch((error) => { if (!cancelled) setIntelligenceNotice(error.message); });
    return () => { cancelled = true; };
  }, [recording.activeMeeting?.id, recording.activeMeeting?.status, recording.activeMeeting?.updatedAt]);

  useEffect(() => {
    setKnowledgeExplanations({});
    setKnowledgeAnswerBusy("");
  }, [recording.activeMeeting?.id]);

  const analyzeMeeting = async () => {
    if (!recording.activeMeeting?.id || !displayedSegments.length) return;
    setIntelligenceBusy(true);
    setIntelligenceNotice("");
    try {
      const result = await postJson(`/api/meetings/${recording.activeMeeting.id}/intelligence`, {
        force: Boolean(intelligence)
      });
      setIntelligence(result.intelligence);
      await onVocabularyRefresh();
      setView("outline");
      setIntelligenceNotice(result.cached ? "저장된 분석을 불러왔습니다." : "현재 전사를 기준으로 구조를 정리했습니다.");
    } catch (error) {
      setIntelligenceNotice(error.message);
    } finally {
      setIntelligenceBusy(false);
    }
  };
  const languageSelector = (
    <Selector
      label="전사 언어"
      isLabelHidden
      variant="ghost"
      size="sm"
      value={recording.language}
      onChange={recording.setLanguage}
      options={[
        { value: "ko", label: "한국어" },
        { value: "en", label: "English" },
        { value: "ja", label: "日本語" },
        { value: "", label: "자동 감지" }
      ]}
    />
  );

  const recordKnowledgeEvidence = async (term, kind) => {
    if (!term?.term || knowledgeBusyTerm) return;
    setKnowledgeBusyTerm(term.term);
    setIntelligenceNotice("");
    try {
      const meeting = recording.activeMeeting;
      const eventId = kind === "card_open" && meeting?.id
        ? `card:${meeting.id}:${term.conceptId || term.term}`
        : crypto.randomUUID();
      await postJson("/api/knowledge/evidence", {
        term: term.term,
        kind,
        eventId,
        meetingId: meeting?.id || null,
        segmentIndex: Number.isInteger(term.evidenceSegmentIndex) ? term.evidenceSegmentIndex : null
      });
      if (meeting?.id && intelligence) {
        const refreshed = await apiRequest(`/api/meetings/${meeting.id}/intelligence`);
        setIntelligence(refreshed.intelligence);
      }
      await onVocabularyRefresh();
      const feedback = {
        mark_known: "이해 상태를 ‘알아요’로 반영했습니다.",
        mark_unknown: "설명이 필요하다고 반영했습니다.",
        request_simpler: "다음 설명을 더 쉬운 수준으로 조정했습니다.",
        card_open: "설명을 펼쳤습니다. 이 신호는 이해도에 아주 약하게만 반영됩니다."
      };
      setIntelligenceNotice(feedback[kind] || "이해 상태를 반영했습니다.");
    } catch (error) {
      setIntelligenceNotice(error.message);
    } finally {
      setKnowledgeBusyTerm("");
    }
  };

  const requestKnowledgeExplanation = async (term) => {
    const meeting = recording.activeMeeting;
    if (!term?.term || !meeting?.id || !intelligence || knowledgeBusyTerm) return;
    setKnowledgeBusyTerm(term.term);
    setIntelligenceNotice("");
    try {
      await postJson("/api/knowledge/evidence", {
        term: term.term,
        kind: "request_simpler",
        eventId: crypto.randomUUID(),
        meetingId: meeting.id,
        segmentIndex: Number.isInteger(term.evidenceSegmentIndex) ? term.evidenceSegmentIndex : null
      });
      const result = await postJson("/api/knowledge/explanations", {
        term: term.term,
        meetingId: meeting.id,
        segmentIndex: Number.isInteger(term.evidenceSegmentIndex) ? term.evidenceSegmentIndex : null,
        level: "simple"
      });
      setKnowledgeExplanations((current) => ({
        ...current,
        [term.conceptId || term.term]: result.explanation
      }));
      const refreshed = await apiRequest(`/api/meetings/${meeting.id}/intelligence`);
      setIntelligence(refreshed.intelligence);
      await onVocabularyRefresh();
      setIntelligenceNotice(result.cached ? "저장된 맞춤 해설을 불러왔습니다." : "내 역할과 회의 문맥에 맞춘 쉬운 설명을 만들었습니다.");
    } catch (error) {
      setIntelligenceNotice(error.message);
    } finally {
      setKnowledgeBusyTerm("");
    }
  };

  const answerKnowledgeQuestion = async (explanation, choiceIndex) => {
    if (!explanation?.cacheKey || !Number.isInteger(choiceIndex) || knowledgeAnswerBusy) return;
    setKnowledgeAnswerBusy(explanation.cacheKey);
    setIntelligenceNotice("");
    try {
      const result = await postJson(`/api/knowledge/explanations/${explanation.cacheKey}/answer`, { choiceIndex });
      setKnowledgeExplanations((current) => {
        const key = explanation.conceptId || explanation.term;
        return {
          ...current,
          [key]: {
            ...current[key],
            answer: {
              choiceIndex: result.choiceIndex,
              correct: result.correct,
              rationale: result.rationale
            }
          }
        };
      });
      const meeting = recording.activeMeeting;
      if (meeting?.id && intelligence) {
        const refreshed = await apiRequest(`/api/meetings/${meeting.id}/intelligence`);
        setIntelligence(refreshed.intelligence);
      }
      await onVocabularyRefresh();
      setIntelligenceNotice(result.correct ? "확인 질문 정답을 이해 상태에 반영했습니다." : "확인 질문 결과를 반영하고 설명 필요도를 높였습니다.");
    } catch (error) {
      setIntelligenceNotice(error.message);
    } finally {
      setKnowledgeAnswerBusy("");
    }
  };

  const insight = (
    <IntelligencePanel
      terms={terms}
      actions={actions}
      roles={context.user.vocabulary?.roles || []}
      onEvidence={recordKnowledgeEvidence}
      onExplain={requestKnowledgeExplanation}
      explanations={knowledgeExplanations}
      onAnswer={answerKnowledgeQuestion}
      busyTerm={knowledgeBusyTerm}
      busyAnswer={knowledgeAnswerBusy}
    />
  );

  return (
    <>
      <Layout
        height="fill"
        header={(
        <PageHeader
          title={recording.activeMeeting?.title || "새 실시간 회의"}
          description={`${context.organization.name} · 실제 전사 자동 저장 · ${identifiesSpeakers ? "Nova-3 + 등록 화자 식별" : "Nova-3 실시간 STT 테스트"}`}
          endContent={desktop ? languageSelector : undefined}
        />
        )}
        content={(
        <LayoutContent padding={compact ? 3 : 4}>
          <Stack gap={4}>
            {!recording.hasResult && (
              <Banner
                status={identifiesSpeakers && unverifiedSpeakerCount ? "warning" : "info"}
                title={identifiesSpeakers
                  ? unverifiedSpeakerCount ? `별도 음성 검증이 필요한 화자가 ${unverifiedSpeakerCount}명 있습니다.` : "화자 식별 회의를 시작할 준비가 됐습니다."
                  : "목소리 등록 없이 STT를 바로 시험할 수 있습니다."}
                description={identifiesSpeakers
                  ? unverifiedSpeakerCount
                    ? "설정의 식별 테스트에서 등록에 쓰지 않은 다른 날·거리·마이크의 음성으로 먼저 확인하면 실전 오식별을 줄일 수 있습니다."
                    : "실시간 기록을 시작하거나 파일을 올리면 화자별 전사와 구조가 조직 문서로 자동 저장됩니다."
                  : "아래에서 STT 테스트 시작을 누르고 말하면 중간·확정 전사가 실시간으로 표시되고 자동 저장됩니다."}
              />
            )}
            <Feedback key={recording.mode} message={visibleNotice} status="warning" onDismiss={() => recording.setNotice("")} />
            <Feedback message={intelligenceNotice} status={intelligence ? "success" : "warning"} onDismiss={() => setIntelligenceNotice("")} />
            {recording.activeMeeting?.status !== "recording" && displayedSegments.length > 0 && !intelligence && (
              <Banner
                status="info"
                title={recording.services.meetingIntelligence === "openai" ? "AI 정리는 선택 사항입니다." : "현재는 로컬 구조 분석을 사용합니다."}
                description={recording.services.meetingIntelligence === "openai"
                  ? "AI로 정리를 누르면 이 회의 전사가 OpenAI로 전송되고, 실제 발화 인덱스에 검증된 구조·용어·액션만 저장됩니다."
                  : "OPENAI_API_KEY를 설정하면 역할별 낯선 용어 설명과 더 정교한 주제 구조를 생성할 수 있습니다."}
              />
            )}
            <Stack direction={compact ? "vertical" : "horizontal"} justify="between" align={compact ? "stretch" : "center"} gap={2}>
              <Stack gap={0.5}>
                <Text type="label" color="accent" weight="semibold">LIVE STRUCTURE</Text>
                <Text color="secondary">{intelligence ? `${intelligence.source === "openai" ? "AI" : "로컬"} 분석 · ${new Date(intelligence.generatedAt).toLocaleString("ko-KR")}` : "녹음 중에는 실제 발화 기반 구조가 즉시 갱신됩니다."}</Text>
              </Stack>
              <Stack direction={compact ? "vertical" : "horizontal"} gap={2} align={compact ? "stretch" : "center"}>
                {recording.activeMeeting && displayedSegments.length > 0 && !recording.isRecording && (
                  <Button
                    label={intelligence ? "다시 분석" : recording.services.meetingIntelligence === "openai" ? "AI로 정리" : "구조 정리"}
                    variant="secondary"
                    size="sm"
                    icon={<Icon icon="wrench" />}
                    onClick={analyzeMeeting}
                    isLoading={intelligenceBusy}
                    isDisabled={recording.isBusy}
                  />
                )}
                {!desktop && (
                  <Stack direction="horizontal" gap={2} justify="end">
                    {languageSelector}
                    <Button label="이해 패널" variant="secondary" size="sm" onClick={() => setInsightOpen(true)} />
                  </Stack>
                )}
                <SegmentedControl value={view} onChange={setView} label="회의 보기 방식" size="sm" layout={compact ? "fill" : "hug"}>
                  <SegmentedControlItem value="outline" label="구조도" />
                  <SegmentedControlItem value="tree" label="트리" />
                  <SegmentedControlItem value="mindmap" label="마인드맵" />
                  <SegmentedControlItem value="transcript" label="전사" />
                  <SegmentedControlItem value="overview" label="요약" />
                </SegmentedControl>
              </Stack>
            </Stack>
            {view === "outline" && <StructureDiagram blocks={blocks} selectedId={selectedBlockId} onSelect={setSelectedBlockId} />}
            {view === "tree" && (
              <Stack gap={4}>
                <Card variant="muted" padding={4}>
                  <TreeList items={tree} density={compact ? "compact" : "balanced"} variant="lineGuides" header={<Heading level={2}>회의 구조 지도</Heading>} />
                </Card>
                <TopicEvidence block={blocks.find(({ id }) => id === selectedBlockId)} />
                <Section padding={0}>
                  <TranscriptList segments={displayedSegments} speakers={recording.speakers} onCorrectSpeaker={recording.correctSpeaker} onCorrectText={recording.correctTranscript} compact={compact} mode={recording.mode} termCatalog={vocabularyTerms} />
                </Section>
              </Stack>
            )}
            {view === "mindmap" && <MeetingMindMap blocks={blocks} compact={compact} selectedId={selectedBlockId} onSelect={setSelectedBlockId} />}
            {view === "transcript" && <TranscriptList segments={displayedSegments} speakers={recording.speakers} onCorrectSpeaker={recording.correctSpeaker} onCorrectText={recording.correctTranscript} compact={compact} mode={recording.mode} termCatalog={vocabularyTerms} />}
            {view === "overview" && <MeetingOverview segments={displayedSegments} mode={recording.mode} intelligence={intelligence} terms={terms} actions={actions} />}
          </Stack>
        </LayoutContent>
        )}
        end={desktop ? <LayoutPanel width={400} hasDivider padding={4} label="개인화 용어 및 액션" role="complementary">{insight}</LayoutPanel> : undefined}
        footer={<RecordingFooter recording={recording} compact={compact} />}
      />
      <Dialog isOpen={isInsightOpen} onOpenChange={setInsightOpen} variant={compact ? "fullscreen" : "standard"} width={520} maxHeight="90vh">
        <Layout
          height="fill"
          header={<DialogHeader title="내 이해 패널" subtitle="개인 용어 지식과 역할에 맞춘 설명" onOpenChange={setInsightOpen} />}
          content={<LayoutContent padding={4}>{insight}</LayoutContent>}
        />
      </Dialog>
    </>
  );
}

function meetingDate(value) {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function DashboardPage({ context, onStart, onOpen, recording, vocabularyTerms }) {
  const recentMeetings = recording.meetings.slice(0, 5);
  const unfamiliarTermCount = vocabularyTerms.filter(({ isKnown }) => !isKnown).length;
  const actionCount = deriveActions(allSegments).length;
  return (
    <Layout
      header={<PageHeader title={`안녕하세요, ${context.user.name}님`} description={`${context.organization.name}의 회의를 구조화할 준비가 됐습니다.`} endContent={<Button variant="primary" label="새 회의 시작" icon={<Icon icon="microphone" />} onClick={onStart} />} />}
      content={(
        <LayoutContent padding={4}>
          <Stack gap={6}>
            <Stack direction="horizontal" gap={3} wrap="wrap">
              <Card width={240} padding={4}>
                <Stack gap={1}><Text type="supporting">등록 화자</Text><Heading level={2} type="display-3">{recording.speakers.length}</Heading><Text type="supporting">이 조직에서 식별 가능</Text></Stack>
              </Card>
              <Card width={240} padding={4} variant="red">
                <Stack gap={1}><Text type="supporting">나에게 낯선 용어</Text><Heading level={2} type="display-3">{unfamiliarTermCount}</Heading><Text type="supporting">저장된 실제 회의 기준</Text></Stack>
              </Card>
              <Card width={240} padding={4} variant="teal">
                <Stack gap={1}><Text type="supporting">감지된 액션</Text><Heading level={2} type="display-3">{actionCount}</Heading><Text type="supporting">저장된 실제 발화에서 추출</Text></Stack>
              </Card>
            </Stack>
            <Section dividers={["top"]} paddingInline={0}>
              <List hasDividers header={<Heading level={2}>최근 회의 문서</Heading>}>
                {recentMeetings.length ? recentMeetings.map((meeting) => {
                  const status = meetingStatusPresentation(meeting.status);
                  return <ListItem key={meeting.id} label={meeting.title} description={`${meetingDate(meeting.startedAt)} · ${meeting.segmentCount}개 발화`} startContent={<Icon icon="calendar" color="accent" />} endContent={<Stack direction="horizontal" gap={1}><Token label={meeting.mode === "stt" ? "STT" : `${meeting.speakerCount}명`} color={meeting.mode === "stt" ? "teal" : "default"} size="sm" /><Token label={status.label} color={status.color} size="sm" /></Stack>} onClick={() => onOpen(meeting)} />;
                }) : <ListItem label="아직 저장된 회의가 없습니다" description="새 회의를 시작하면 실제 전사 문서가 여기에 저장됩니다." startContent={<Icon icon="microphone" color="secondary" />} />}
              </List>
            </Section>
          </Stack>
        </LayoutContent>
      )}
    />
  );
}

function DocumentsPage({ meetings, onOpen }) {
  return (
    <Layout
      header={<PageHeader title="회의 문서" description="구조, 전사, 용어와 액션을 한 문서에서 검토합니다." />}
      content={(
        <LayoutContent padding={4}>
          <List hasDividers density="spacious" header={<Heading level={2}>최근 문서</Heading>}>
            {meetings.length ? meetings.map((meeting) => {
              const status = meetingStatusPresentation(meeting.status);
              return <ListItem key={meeting.id} label={meeting.title} description={`${meetingDate(meeting.startedAt)} · ${meeting.mode === "stt" ? "STT 테스트" : `${meeting.speakerCount}명`} · ${meeting.segmentCount}개 발화`} startContent={<Icon icon="calendar" color="accent" />} endContent={<Token label={status.label} color={status.color} size="sm" />} onClick={() => onOpen(meeting)} />;
            }) : <ListItem label="저장된 회의 문서가 없습니다" description="실시간 기록 또는 파일 전사를 완료하면 자동으로 생성됩니다." startContent={<Icon icon="search" color="secondary" />} />}
          </List>
        </LayoutContent>
      )}
    />
  );
}

function DictionaryPage({ terms, onRefresh }) {
  const [newTerm, setNewTerm] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busyTerm, setBusyTerm] = useState("");
  const submitEvidence = async (term, kind) => {
    setBusyTerm(term);
    setFeedback("");
    try {
      await postJson("/api/knowledge/evidence", { term, kind, eventId: crypto.randomUUID() });
      await onRefresh();
      setFeedback(kind === "mark_known" ? `${term}을 아는 개념으로 반영했습니다.` : `${term}에 설명이 필요하다고 반영했습니다.`);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setBusyTerm("");
    }
  };
  const addKnownTerm = async (event) => {
    event.preventDefault();
    const term = newTerm.trim();
    if (!term) return;
    if (terms.some((value) => value.term.toLocaleLowerCase() === term.toLocaleLowerCase() && value.isKnown)) return setFeedback("이미 아는 개념으로 등록된 용어입니다.");
    await submitEvidence(term, "mark_known");
    setNewTerm("");
  };
  return (
    <Layout
      header={<PageHeader title="개인 용어 사전" description="아는 용어는 설명을 접고, 낯선 용어에만 업무 관점의 풀이를 제공합니다." />}
      content={(
        <LayoutContent padding={4}>
          <Stack gap={4} maxWidth={960}>
            <Feedback message={feedback} status="warning" onDismiss={() => setFeedback("")} />
            <Banner status="info" title="이 지식 상태는 본인에게만 보입니다." description="회의 참여자와 조직 관리자는 이해 확률이나 피드백 기록을 조회할 수 없습니다. 직접 선택한 피드백이 자동 추정보다 항상 우선합니다." />
            <Card padding={4}>
              <Stack as="form" direction="horizontal" gap={2} align="end" onSubmit={addKnownTerm}>
                <TextInput label="내가 이미 아는 용어 추가" value={newTerm} onChange={setNewTerm} placeholder="실제 업무 용어 입력" width="100%" />
                <Button type="submit" label="아는 개념 추가" variant="primary" isLoading={busyTerm === newTerm.trim()} isDisabled={!newTerm.trim() || Boolean(busyTerm)} />
              </Stack>
            </Card>
            <List hasDividers density="spacious" header={<Heading level={2}>실제 회의에서 축적된 용어</Heading>}>
              {terms.length ? terms.map((term) => {
                const known = term.isKnown;
                const evidence = term.meetingCount ? `${term.meetingCount}개 회의 · ${term.occurrences}회 감지` : "직접 등록한 기지식";
                const percentage = Math.round((term.knowledge?.pKnown ?? (known ? 1 : 0.35)) * 100);
                const statusLabel = known ? "이해함" : term.knowledge?.status === "unknown" ? "설명 필요" : "학습 중";
                return <ListItem
                  key={term.conceptId || term.term}
                  label={term.term}
                  description={<Stack gap={2}><Text type="supporting">{term.definition || "직접 등록한 개념입니다."} · {evidence}</Text><ProgressBar label={`이해 가능성 ${percentage}%`} value={percentage} hasValueLabel /><Text type="supporting">{term.knowledge?.evidenceCount ? `내 피드백 ${term.knowledge.evidenceCount}개 기반` : "초기 추정"}</Text></Stack>}
                  startContent={<Token label={statusLabel} color={known ? "green" : term.knowledge?.status === "unknown" ? "red" : "yellow"} size="sm" />}
                  endContent={<Button label={known ? "잘 모르겠어요" : "이제 알아요"} variant="ghost" size="sm" isLoading={busyTerm === term.term} isDisabled={Boolean(busyTerm) && busyTerm !== term.term} onClick={() => submitEvidence(term.term, known ? "mark_unknown" : "mark_known")} />}
                />;
              }) : <ListItem label="아직 축적된 용어가 없습니다" description="회의를 구조 분석하면 실제 발화에서 발견된 낯선 용어가 여기에 저장됩니다." startContent={<Icon icon="info" color="secondary" />} />}
            </List>
          </Stack>
        </LayoutContent>
      )}
    />
  );
}

function SettingsPage({ context, recording }) {
  const { compact } = useViewport();
  const [members, setMembers] = useState([]);
  const [speakerName, setSpeakerName] = useState("");
  const [speakerFile, setSpeakerFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [sampleTarget, setSampleTarget] = useState(null);
  const [sampleFile, setSampleFile] = useState(null);
  const [identificationFile, setIdentificationFile] = useState(null);
  const [independentRecording, setIndependentRecording] = useState(false);
  const [expectedSpeakerId, setExpectedSpeakerId] = useState("");
  const [identification, setIdentification] = useState(null);

  useEffect(() => {
    apiRequest("/api/organizations/current/members").then((result) => setMembers(result.members || [])).catch((error) => setFeedback(error.message));
  }, []);

  const enroll = async (event) => {
    event.preventDefault();
    if (!speakerFile) return setFeedback("MP3 또는 WAV 파일을 선택해 주세요.");
    setBusy(true);
    setFeedback("");
    try {
      const speaker = await recording.enrollSpeaker(speakerName, speakerFile);
      setSpeakerName("");
      setSpeakerFile(null);
      setFeedback(`${speaker.name} 목소리를 등록했습니다.${speaker.audioQuality?.warnings?.[0] ? ` ${speaker.audioQuality.warnings[0]}` : " 음성 품질도 안정적입니다."}`);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await recording.removeSpeaker(deleteTarget.id);
      setDeleteTarget(null);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setBusy(false);
    }
  };

  const addSample = async (event) => {
    event.preventDefault();
    if (!sampleTarget || !sampleFile) return setFeedback("추가할 MP3 또는 WAV 파일을 선택해 주세요.");
    setBusy(true);
    setFeedback("");
    try {
      const speaker = await recording.addSpeakerSample(sampleTarget.id, sampleFile);
      setSampleTarget(null);
      setSampleFile(null);
      setFeedback(`${speaker.name}의 목소리 표본을 추가했습니다. 서로 다른 환경의 표본이 실시간 식별 안정성을 높입니다.`);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setBusy(false);
    }
  };

  const copyInvite = async () => {
    await navigator.clipboard.writeText(context.organization.inviteCode);
    setFeedback("초대 코드를 복사했습니다.");
  };

  const identifySpeaker = async (event) => {
    event.preventDefault();
    if (!identificationFile) return setFeedback("식별을 시험할 MP3 또는 WAV 파일을 선택해 주세요.");
    setBusy(true);
    setFeedback("");
    setIdentification(null);
    try {
      const form = new FormData();
      form.append("voice", identificationFile);
      form.append("independentRecording", independentRecording ? "true" : "false");
      form.append("expectedSpeakerId", expectedSpeakerId);
      const result = await apiRequest("/api/speakers/identify", { method: "POST", body: form });
      setIdentification(result);
      if (result.speakerProfile) recording.updateSpeaker(result.speakerProfile);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Layout
        header={<PageHeader title="조직 및 음성 설정" description="구성원, 초대 코드와 조직 전용 화자 프로필을 관리합니다." />}
        content={(
        <LayoutContent padding={compact ? 3 : 4}>
          <Stack gap={6} maxWidth={920}>
            {feedback && <Feedback message={feedback} status={feedback.includes("등록했습니다") || feedback.includes("복사") ? "success" : "info"} onDismiss={() => setFeedback("")} />}
            <Section dividers={["bottom"]} paddingInline={0}>
              <Stack gap={3}>
                <Heading level={2}>조직</Heading>
                <Card variant="muted" padding={4}>
                  <Stack direction={compact ? "vertical" : "horizontal"} justify="between" align={compact ? "stretch" : "center"} gap={3}>
                    <Stack gap={1}>
                      <Text weight="semibold">{context.organization.name}</Text>
                      <Text type="supporting">{context.organization.domain || "도메인 미설정"} · {members.length}명</Text>
                    </Stack>
                    <Stack direction="horizontal" gap={2} align="center">
                      <Text type="code">{context.organization.inviteCode}</Text>
                      <Button label="초대 코드 복사" variant="secondary" size="sm" icon={<Icon icon="copy" />} onClick={copyInvite} />
                    </Stack>
                  </Stack>
                </Card>
                <List hasDividers header={<Heading level={3}>구성원</Heading>}>
                  {members.map((member) => <ListItem key={member.id} label={member.name} description={member.email} startContent={<Avatar name={member.name} size="sm" />} endContent={<Token label={member.role === "owner" ? "관리자" : "멤버"} color={member.role === "owner" ? "teal" : "default"} size="sm" />} />)}
                </List>
              </Stack>
            </Section>
            <Section paddingInline={0}>
              <Stack gap={4}>
                <Stack gap={1}>
                  <Stack direction="horizontal" justify="between" align="center" gap={2}>
                    <Heading level={2}>등록 화자</Heading>
                    <Stack direction="horizontal" gap={2} align="center">
                      <Token
                        label={recording.services.speakerModelState === "ready" ? "화자 모델 준비됨" : recording.services.speakerModelState === "failed" ? "화자 모델 오류" : "화자 모델 준비 중"}
                        color={recording.services.speakerModelState === "ready" ? "green" : recording.services.speakerModelState === "failed" ? "red" : "yellow"}
                        size="sm"
                      />
                      <Token label={recording.services.biometricEncryption ? "암호화 저장" : "개발용 평문 저장"} color={recording.services.biometricEncryption ? "green" : "yellow"} size="sm" />
                    </Stack>
                  </Stack>
                  <Text color="secondary">한 사람만 말하는 잡음 없는 15~30초 MP3/WAV를 권장합니다. 여러 음성 구간의 일관성을 검증해 조직 전용 프로필로 저장합니다.</Text>
                </Stack>
                {!recording.services.biometricEncryption && <Banner status="warning" title="생체정보 저장 암호화가 꺼져 있습니다." description="개발 환경에서만 허용됩니다. 배포 전 VOICE_BIOMETRIC_KEY를 설정하고 기존 평문 프로필을 마이그레이션해야 합니다." />}
                <Card padding={4}>
                  <Stack as="form" onSubmit={enroll} gap={3}>
                    <FormLayout direction={compact ? "vertical" : "horizontal"} defaultOptionality="required">
                      <TextInput label="화자 이름" value={speakerName} onChange={setSpeakerName} isRequired width="100%" />
                      <FileInput label="참조 음성" value={speakerFile} onChange={setSpeakerFile} accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav" isRequired width="100%" />
                    </FormLayout>
                    <Stack direction="horizontal" justify="end">
                      <Button type="submit" variant="primary" label="목소리 등록" isLoading={busy} />
                    </Stack>
                  </Stack>
                </Card>
                <Card padding={4} variant="muted">
                  <Stack as="form" onSubmit={identifySpeaker} gap={3}>
                    <Stack gap={1}>
                      <Heading level={3}>등록 목소리 식별 테스트</Heading>
                      <Text color="secondary">프로필을 바꾸지 않고 최대 15초만 분석해 실시간 판정 기준을 미리 확인합니다.</Text>
                    </Stack>
                    <FormLayout direction={compact ? "vertical" : "horizontal"} defaultOptionality="required">
                      <Selector
                        label="실제 화자"
                        value={expectedSpeakerId}
                        onChange={(value) => { setExpectedSpeakerId(value); setIndependentRecording(false); setIdentification(null); }}
                        options={[{ value: "", label: "선택하지 않음" }, ...recording.speakers.map((speaker) => ({ value: speaker.id, label: speaker.name }))]}
                        width="100%"
                      />
                      <FileInput label="테스트 음성" value={identificationFile} onChange={(file) => { setIdentificationFile(file); setIndependentRecording(false); setIdentification(null); }} accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav" isRequired width="100%" />
                    </FormLayout>
                    <CheckboxInput
                      label="등록에 사용하지 않은 별도 녹음입니다"
                      description="다른 날·거리·마이크에서 녹음한 파일일 때만 선택하세요. 선택하지 않아도 식별 결과는 확인할 수 있습니다."
                      value={independentRecording}
                      onChange={setIndependentRecording}
                      isDisabled={!identificationFile || !expectedSpeakerId}
                      disabledMessage={!identificationFile ? "먼저 테스트 음성을 선택해 주세요." : "검증할 실제 화자를 선택해 주세요."}
                    />
                    <Stack direction="horizontal" justify="end">
                      <Button
                        type="submit"
                        variant="secondary"
                        label="누구인지 테스트"
                        isLoading={busy && Boolean(identificationFile)}
                        isDisabled={!recording.speakers.length || !identificationFile}
                      />
                    </Stack>
                    {!recording.speakers.length && <Text type="supporting">테스트하려면 먼저 목소리를 한 명 이상 등록해 주세요.</Text>}
                    {identification && (
                      <Stack gap={3}>
                        <Banner
                          status={identification.verification?.attemptRecorded && !identification.verification.recorded ? "warning" : identification.identification.matched ? "success" : "warning"}
                          title={identification.verification?.attemptRecorded && !identification.verification.recorded
                            ? "선택한 실제 화자와 판정이 일치하지 않았습니다."
                            : identification.identification.matched
                            ? `${identification.identification.speaker.name}님으로 식별했습니다.`
                            : "이름을 확정하지 않았습니다."}
                          description={`${identification.identification.message} ${identification.verification?.message || ""}`.trim()}
                        />
                        <ProgressBar
                          label={`최고 음성 유사도 · 기준 ${Math.round(identification.identification.requiredThreshold * 100)}%`}
                          value={Math.max(0, Math.min(100, Math.round(identification.identification.confidence * 100)))}
                          hasValueLabel
                        />
                        {identification.identification.scoreGap != null && (
                          <Text type="supporting">
                            2순위와 차이 {Math.round(identification.identification.scoreGap * 100)}%p · 필요한 차이 {Math.round(identification.identification.requiredMargin * 100)}%p · 입력 품질 {identification.quality.score}점
                          </Text>
                        )}
                        <Text type="supporting">판정이 불안정하면 같은 사람의 다른 날·거리·마이크 샘플을 추가한 뒤 다시 시험해 보세요.</Text>
                      </Stack>
                    )}
                  </Stack>
                </Card>
                <List hasDividers header={<Heading level={3}>식별 가능한 사람</Heading>}>
                  {recording.speakers.length ? recording.speakers.map((speaker) => {
                    const quality = speaker.audioQuality;
                    const verificationCount = speaker.verificationSuccessCount ?? speaker.crossSessionVerificationCount ?? 0;
                    const verificationAttempts = Math.max(verificationCount, speaker.verificationAttemptCount || 0);
                    const verificationColor = !verificationAttempts ? "yellow" : verificationCount === verificationAttempts ? "green" : verificationCount ? "yellow" : "red";
                    const metadata = `${speaker.enrollmentSessionCount || 1}회 등록 · ${(speaker.totalEnrollmentDuration || speaker.duration).toFixed(1)}초 · ${speaker.profileCount || 1}개 음성 표본 · ${speaker.enrollmentConsistency ? `내부 일관성 ${Math.round(speaker.enrollmentConsistency * 100)}%` : "기존 프로필"}`;
                    const controls = <Stack direction="horizontal" gap={2} align="center"><Token label={verificationAttempts ? `별도 검증 ${verificationCount}/${verificationAttempts} 통과` : "별도 검증 필요"} color={verificationColor} size="sm" />{quality && <Token label={`품질 ${quality.score}점`} color={quality.score >= 80 ? "green" : quality.score >= 60 ? "yellow" : "red"} size="sm" />}<Button label="샘플 추가" variant="secondary" size="sm" onClick={() => { setSampleTarget(speaker); setSampleFile(null); }} /><Button label={`${speaker.name} 삭제`} variant="ghost" size="sm" onClick={() => setDeleteTarget(speaker)} /></Stack>;
                    const description = compact ? <Stack gap={2}><Text type="supporting">{metadata}</Text>{quality?.warnings?.[0] && <Text type="supporting">{quality.warnings[0]}</Text>}{controls}</Stack> : `${metadata}${quality?.warnings?.[0] ? ` · ${quality.warnings[0]}` : ""}`;
                    return <ListItem key={speaker.id} label={speaker.name} description={description} startContent={<Avatar name={speaker.name} size="sm" />} endContent={compact ? undefined : controls} />;
                  }) : <ListItem label="등록된 화자가 없습니다" description="위에서 참조 음성을 등록하면 실시간 이름 식별을 시작할 수 있습니다." startContent={<Icon icon="microphone" color="secondary" />} />}
                </List>
              </Stack>
            </Section>
          </Stack>
        </LayoutContent>
        )}
      />
      <Dialog isOpen={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)} purpose="required" width={420}>
        <Layout
          header={<DialogHeader title="등록 목소리를 삭제할까요?" subtitle="다음 실시간 회의부터 이 이름을 식별할 수 없습니다." />}
          content={<LayoutContent padding={4}><Text as="p">{deleteTarget?.name}의 임베딩과 참조 음성 파일을 조직 저장소에서 삭제합니다.</Text></LayoutContent>}
          footer={<LayoutFooter hasDivider><Section padding={3}><Stack direction="horizontal" justify="end" gap={2}><Button label="취소" variant="secondary" onClick={() => setDeleteTarget(null)} /><Button label="목소리 삭제" variant="destructive" onClick={remove} isLoading={busy} /></Stack></Section></LayoutFooter>}
        />
      </Dialog>
      <Dialog isOpen={Boolean(sampleTarget)} onOpenChange={(open) => { if (!open) { setSampleTarget(null); setSampleFile(null); } }} purpose="required" width={480}>
        <Layout
          header={<DialogHeader title={`${sampleTarget?.name || "화자"} 음성 샘플 추가`} subtitle="다른 날·거리·마이크 환경의 깨끗한 음성을 누적하면 이름 식별이 더 안정적입니다." />}
          content={<LayoutContent padding={4}><Stack as="form" id="speaker-sample-form" onSubmit={addSample} gap={3}><FileInput label="추가 참조 음성" value={sampleFile} onChange={setSampleFile} accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav" isRequired width="100%" /><Text type="supporting">한 사람만 말하는 15~30초 파일을 권장하며, 최대 8회까지 추가할 수 있습니다.</Text></Stack></LayoutContent>}
          footer={<LayoutFooter hasDivider><Section padding={3}><Stack direction="horizontal" justify="end" gap={2}><Button label="취소" variant="secondary" onClick={() => { setSampleTarget(null); setSampleFile(null); }} /><Button type="submit" form="speaker-sample-form" label="샘플 분석 및 추가" variant="primary" isLoading={busy} /></Stack></Section></LayoutFooter>}
        />
      </Dialog>
    </>
  );
}

function Workspace({ context, onContextChange, onLogout }) {
  const [page, setPage] = useState("record");
  const [vocabularyTerms, setVocabularyTerms] = useState([]);
  const recording = useRecording();
  const navItems = [
    ["home", "홈", "calendar"],
    ["record", "실시간 기록", "microphone"],
    ["documents", "회의 문서", "search"],
    ["dictionary", "개인 용어 사전", "info"],
    ["settings", "조직 및 음성 설정", "wrench"]
  ];

  const refreshVocabulary = async () => {
    const result = await apiRequest("/api/vocabulary/terms");
    setVocabularyTerms(result.terms || []);
    return result.terms || [];
  };

  useEffect(() => {
    let cancelled = false;
    apiRequest("/api/vocabulary/terms")
      .then(({ terms }) => { if (!cancelled) setVocabularyTerms(terms || []); })
      .catch(() => { if (!cancelled) setVocabularyTerms([]); });
    return () => { cancelled = true; };
  }, [context.organization.id, (context.user.vocabulary?.knownTerms || []).join("\u0000")]);

  const sideNav = (
    <SideNav
      header={<SideNavHeading heading="Voice Partition" superheading={context.organization.name} icon={<Icon icon="microphone" color="accent" />} />}
      topContent={<Button label="새 실시간 기록" variant="primary" width="100%" icon={<Icon icon="microphone" />} onClick={() => { recording.resetMeeting(); setPage("record"); }} />}
      footer={(
        <Section variant="muted" padding={3}>
          <Stack direction="horizontal" gap={2} align="center">
            <Avatar name={context.user.name} size="sm" />
            <Stack gap={0.5}>
              <Text type="label">{context.user.name}</Text>
              <Text type="supporting" maxLines={1}>{context.user.email}</Text>
            </Stack>
          </Stack>
        </Section>
      )}
      footerIcons={<Button label="로그아웃" variant="ghost" size="sm" onClick={onLogout} />}
      collapsible={{ defaultIsCollapsed: false, buttonLabel: "사이드바 접기" }}
    >
      <SideNavSection title="워크스페이스">
        {navItems.map(([value, label, icon]) => <SideNavItem key={value} label={label} icon={icon} isSelected={page === value} onClick={() => setPage(value)} />)}
      </SideNavSection>
    </SideNav>
  );

  let content;
  const startNewMeeting = () => { recording.resetMeeting(); setPage("record"); };
  const openMeeting = (meeting) => { recording.openMeeting(meeting); setPage("record"); };
  if (page === "home") content = <DashboardPage context={context} recording={recording} onStart={startNewMeeting} onOpen={openMeeting} vocabularyTerms={vocabularyTerms} />;
  else if (page === "documents") content = <DocumentsPage meetings={recording.meetings} onOpen={openMeeting} />;
  else if (page === "dictionary") content = <DictionaryPage terms={vocabularyTerms} onRefresh={refreshVocabulary} />;
  else if (page === "settings") content = <SettingsPage context={context} recording={recording} />;
  else content = <MeetingPage context={context} recording={recording} vocabularyTerms={vocabularyTerms} onVocabularyRefresh={refreshVocabulary} />;

  return <AppShell sideNav={sideNav} variant="section" height="fill" contentPadding={0} mobileNav={{ breakpoint: "md" }}>{content}</AppShell>;
}

export default function App() {
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("/api/session")
      .then((session) => setContext(session))
      .catch((error) => { if (error.status !== 401) console.error(error); })
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await apiRequest("/api/auth/logout", { method: "POST" });
    setContext(null);
  };

  if (loading) {
    return (
      <AppShell variant="surface" height="fill" contentPadding={6}>
        <Stack height="100%" justify="center" align="center" gap={3}>
          <Heading level={1}>Voice Partition</Heading>
          <ProgressBar label="워크스페이스 불러오는 중" isIndeterminate isLabelHidden />
        </Stack>
      </AppShell>
    );
  }
  if (!context?.authenticated && !context?.user) return <AuthScreen onAuthenticated={setContext} />;
  if (!context.organization) return <OrganizationSetup context={context} onChange={setContext} />;
  if (!context.user.vocabulary?.onboardedAt) return <VocabularyOnboarding context={context} onChange={setContext} />;
  return <Workspace context={context} onContextChange={setContext} onLogout={logout} />;
}
