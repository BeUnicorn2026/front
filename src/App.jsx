import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Avatar } from "@astryxdesign/core/Avatar";
import { AvatarGroup } from "@astryxdesign/core/AvatarGroup";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Center } from "@astryxdesign/core/Center";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { FileInput } from "@astryxdesign/core/FileInput";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Layout, LayoutContent, LayoutFooter, LayoutHeader } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { Section } from "@astryxdesign/core/Section";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Stack } from "@astryxdesign/core/Stack";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Token } from "@astryxdesign/core/Token";
import { Toolbar } from "@astryxdesign/core/Toolbar";
import { TopNav, TopNavHeading, TopNavItem } from "@astryxdesign/core/TopNav";
import { TreeList } from "@astryxdesign/core/TreeList";
import { apiEndpoint, apiRequest, postJson, putJson } from "./api";
import {
  ROLE_OPTIONS, buildAnalyzedStructure, buildDialogueMapLayout, buildDialogueMapTrees, buildMeetingStructure, buildMindMapLayout, buildStructureBlocks, buildStructureDiagramLayout,
  deriveActions, deriveTerms, formatTime, matchingTerms, meetingStatusPresentation
} from "./data/intelligence";
import { MEETING_VIEW_OPTIONS, TRANSCRIPTION_LANGUAGE_OPTIONS } from "./data/meeting-view-options";
import { workspacePageFromPath, workspacePathForPage } from "./data/navigation";
import { microphoneLevelPresentation, speakerProbeCanBecomeSample, useRecording } from "./features/recording/useRecording";
import { BillingPage } from "./features/billing/BillingPage";

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

const MASCOT_ART = Object.freeze({
  guide: "/characters/guide-yellow.png",
  welcome: "/characters/welcome-blue.png",
  empty: "/characters/empty-pink.png",
  connecting: "/characters/connecting-mint.png"
});

function MascotArtwork({ kind, alt, size = "calc(var(--spacing-10) * 3)" }) {
  return (
    <Stack
      as="figure"
      width={size}
      height={size}
      style={{
        flex: "none",
        margin: "var(--spacing-0)",
        overflow: "hidden",
        borderRadius: "var(--radius-page)",
        boxShadow: "var(--shadow-low)"
      }}
    >
      <img
        src={MASCOT_ART[kind]}
        alt={alt}
        draggable="false"
        style={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }}
      />
    </Stack>
  );
}

function ServiceConnectionScreen({ error, onRetry, isRetrying }) {
  const configurationProblem = error?.code === "INVALID_API_RESPONSE";
  return (
    <AppShell variant="surface" height="fill" contentPadding={0}>
      <Center width="100%" height="100%" padding={6}>
        <Stack maxWidth={560} gap={6} align="center">
          <Stack gap={2} align="center">
            <StatusDot variant="error" label="API 연결 실패" />
            <Heading level={1} textWrap="balance">서비스에 연결할 수 없습니다</Heading>
            <Text color="secondary" justify="center" as="p">
              {configurationProblem
                ? "프론트엔드가 API 대신 정적 페이지를 받았습니다. Cloudflare의 VITE_API_ORIGIN과 백엔드 배포 상태를 확인해 주세요."
                : "잠시 후 다시 시도해 주세요. 문제가 계속되면 API 서버와 네트워크 상태를 확인해야 합니다."}
            </Text>
          </Stack>
          <Stack gap={1} align="center">
            <Text type="supporting">연결 대상</Text>
            <Text type="code">{apiEndpoint()}</Text>
          </Stack>
          <Button variant="primary" size="lg" label="다시 연결" onClick={onRetry} isLoading={isRetrying} />
        </Stack>
      </Center>
    </AppShell>
  );
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
          <Text type="supporting">말하는 동안 정리되는 회의 기록</Text>
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

function AuthScreen({ onAuthenticated }) {
  const { compact, desktop, reducedMotion } = useViewport();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [verification, setVerification] = useState(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const authViewportRef = useRef(null);

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
    authViewportRef.current?.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  };

  return (
    <AppShell variant="surface" height="fill" contentPadding={0}>
      <Stack direction={desktop ? "horizontal" : "vertical"} height="100%">
        {desktop && <Stack width="var(--layout-auth-brand-width)" height="100%" justify="between" padding={10} gap={8} style={{ background: "var(--brand-cream)", color: "var(--brand-ink)", flex: "none" }}>
            <Stack direction="horizontal" gap={2} align="center">
              <Stack width={36} height={36} align="center" justify="center" style={{ background: "var(--brand-mint)", borderRadius: "var(--radius-element)" }}>
                <Icon icon="microphone" color="inherit" label="Voice Partition" size="lg" />
              </Stack>
              <Text type="large" weight="semibold">VOICE PARTITION</Text>
            </Stack>
            <Stack gap={6} maxWidth={480}>
              <Stack direction="horizontal" gap={5} align="center">
                <Heading level={1} type={compact ? "display-3" : "display-2"} textWrap="balance">회의가 끝나면 문서도 끝나 있어요</Heading>
                <MascotArtwork kind="guide" alt="회의 기록을 안내하는 노란 캐릭터" size="calc(var(--spacing-10) * 3)" />
              </Stack>
              <Stack gap={4}>
                {[
                  ["var(--brand-mint)", "말하는 동안 구조가 잡힙니다", "주제 · 결정 · 액션 아이템이 트리로 정리돼요"],
                  ["var(--brand-coral)", "모르는 말은 그 자리에서 풀어서", "직무에 맞춰 설명 수준을 바꿉니다"],
                  ["var(--brand-yellow)", "조직 용어집이 같이 자랍니다", "한 번 확인한 지식은 다음 회의에도 적용돼요"]
                ].map(([background, title, description]) => (
                  <Stack key={title} direction="horizontal" gap={3} align="start">
                    <Stack width={28} height={28} style={{ background, borderRadius: "var(--radius-inner)", flex: "none" }} />
                    <Stack gap={0.5}>
                      <Text weight="semibold">{title}</Text>
                      <Text type="supporting" color="secondary">{description}</Text>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </Stack>
            <Text type="supporting" color="secondary">회의 녹음은 조직이 설정한 보관 정책에 따라 관리됩니다.</Text>
        </Stack>}
        <Section width="100%" height="100%" padding={compact ? 4 : 10}>
          <Stack ref={authViewportRef} height="100%" justify={compact ? "start" : "between"} align="center" gap={compact ? 6 : 8} isScrollable={compact}>
            {compact ? (
              <Stack width="100%" maxWidth={400} gap={4} paddingBlockStart={2} data-mobile-auth-header>
                <Stack direction="horizontal" justify="between" align="center" gap={3}>
                  <Stack direction="horizontal" gap={2} align="center">
                    <Stack width={36} height={36} align="center" justify="center" style={{ background: "var(--brand-mint)", color: "var(--brand-ink)", borderRadius: "var(--radius-element)" }}>
                      <Icon icon="microphone" color="inherit" label="보이스 파티션" />
                    </Stack>
                    <Text weight="semibold">보이스 파티션</Text>
                  </Stack>
                  <MascotArtwork kind="welcome" alt="로그인을 반기는 파란 캐릭터" size="calc(var(--spacing-10) + var(--spacing-4))" />
                </Stack>
                <Stack gap={1}>
                  <Heading level={1} type="display-3" textWrap="balance">회의를 바로 기록하세요</Heading>
                  <Text color="secondary">로그인하면 참여했던 회의와 실시간 받아쓰기가 이어집니다.</Text>
                </Stack>
              </Stack>
            ) : (
              <Stack direction="horizontal" width="100%" maxWidth={400} justify="end">
                <Text type="supporting" color="secondary">보안이 적용된 조직 워크스페이스</Text>
              </Stack>
            )}
            <Stack as="form" onSubmit={submit} gap={6} width="100%" maxWidth={400}>
              <Stack gap={1.5}>
                <Heading level={2}>{verification ? "이메일을 확인해 주세요" : mode === "login" ? "다시 만나서 반가워요" : "계정을 만들어 시작하세요"}</Heading>
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
            <Text type="supporting" color="secondary" justify="center" style={{ paddingBlockEnd: compact ? "var(--spacing-4)" : 0 }}>
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
                <Text type="label" color="accent" weight="semibold">2 / 3 단계</Text>
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
            <Text type="label" color="accent" weight="semibold">3 / 3 단계</Text>
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

function PageHeader({ title, description, endContent }) {
  const { compact } = useViewport();
  return (
    <LayoutHeader
      height={compact ? "calc(var(--spacing-10) * 2 + var(--spacing-4))" : "calc(var(--spacing-10) * 3)"}
      label={`${title} 헤더`}
      style={{ background: "var(--color-background-surface)" }}
    >
      <Toolbar
        label={`${title} 도구`}
        size="lg"
        startContent={(
          <Stack gap={1} style={{ minWidth: 0 }}>
            <Heading level={1} type={compact ? undefined : "display-3"} maxLines={1}>{title}</Heading>
            {description && <Text color="secondary" maxLines={2} style={{ wordBreak: "keep-all", overflowWrap: "break-word" }}>{description}</Text>}
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
              {segment.pending && <Token label="인식 중" color="yellow" size="sm" />}
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
  const [panelTab, setPanelTab] = useState("terms");
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
      <TabList value={panelTab} onChange={setPanelTab} layout="fill" size="sm" hasDivider>
        <Tab value="terms" label={`용어 ${terms.length}`} />
        <Tab value="actions" label={`액션 ${actions.length}`} />
      </TabList>
      <Stack gap={4}>
        {panelTab === "terms" && (
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
        )}
        {panelTab === "actions" && (
        <List hasDividers header={<Heading level={3}>액션 아이템</Heading>}>
          {actions.map((action) => (
            <ListItem key={action.id} label={action.text} description={`담당 · ${action.owner}`} startContent={<Token label="할 일" color="teal" size="sm" />} endContent={<Text type="code" color="secondary">{action.due}</Text>} />
          ))}
          {!actions.length && <ListItem label="감지된 액션이 없습니다" description="담당이나 기한이 실제 발화로 확인되면 여기에 표시됩니다." startContent={<Icon icon="info" color="secondary" />} />}
        </List>
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

function StructureDiagram({ blocks, selectedId, onSelect, isRecording, compact }) {
  const nodeRefs = useRef(new Map());
  if (!blocks.length) {
    return <Banner status="info" title="아직 구조화할 발화가 없습니다." description="녹음을 시작하면 실제 대화 순서대로 구간이 만들어집니다." />;
  }
  const layout = buildStructureDiagramLayout(blocks);
  const selectedIndex = Math.max(0, blocks.findIndex(({ id }) => id === selectedId));
  const focusNode = (targetIndex) => {
    const target = blocks[targetIndex];
    if (!target) return;
    onSelect(target.id);
    window.requestAnimationFrame(() => nodeRefs.current.get(target.id)?.focus());
  };
  return (
    <Stack gap={4}>
      <Stack direction="horizontal" gap={3} align="center" justify="between" wrap="wrap">
        <Stack gap={0.5}>
          <Heading level={2}>시간 흐름 구조도</Heading>
          <Text color="secondary">주제 {blocks.length}개 · 실제 발화 {blocks.reduce((sum, block) => sum + block.segments.length, 0)}개 · 화살표 순서로 읽습니다.</Text>
        </Stack>
        <Stack direction="horizontal" gap={2}>
          <Button label="이전 주제" variant="secondary" size="sm" isDisabled={selectedIndex <= 0} onClick={() => focusNode(selectedIndex - 1)} />
          <Button label="다음 주제" variant="secondary" size="sm" isDisabled={selectedIndex >= blocks.length - 1} onClick={() => focusNode(selectedIndex + 1)} />
        </Stack>
      </Stack>
      <Card variant="muted" padding={2} style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${layout.width} ${layout.height}`} width={compact ? 760 : "100%"} height={compact ? Math.round(layout.height * 0.76) : layout.height} role="group" aria-label={`${blocks.length}개 실제 회의 주제의 시간 흐름 구조도`}>
          <title>실제 발화 순서로 구성한 회의 구조도</title>
          <defs>
            <marker id="structure-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-border-emphasized)" />
            </marker>
          </defs>
          <g>
            <rect x="410" y="34" width="180" height="70" rx="16" fill="var(--brand-ink)" />
            <text x="500" y="64" textAnchor="middle" fill="var(--brand-cream)" fontSize="var(--font-size-lg)" fontWeight="var(--font-weight-semibold)">회의 시작</text>
            <text x="500" y="87" textAnchor="middle" fill="var(--brand-cream)" fontSize="var(--font-size-sm)">{formatTime(blocks[0].start)} · {new Set(blocks.flatMap(({ speakers }) => speakers || [])).size}명 참여</text>
          </g>
          {layout.edges.map((edge) => <path key={edge.id} d={edge.path} fill="none" stroke="var(--color-border-emphasized)" strokeWidth="3" markerEnd="url(#structure-arrow)" />)}
          {layout.nodes.map((node) => {
            const selected = node.id === selectedId;
            const live = isRecording && node.index === blocks.length - 1;
            return (
              <g
                key={node.id}
                ref={(element) => {
                  if (element) nodeRefs.current.set(node.id, element);
                  else nodeRefs.current.delete(node.id);
                }}
                role="button"
                tabIndex={selected ? 0 : -1}
                cursor="pointer"
                aria-label={`${node.index + 1}번째 주제 ${node.label}, ${formatTime(node.start)}, 발화 ${node.segments.length}개`}
                aria-pressed={selected}
                onClick={() => onSelect(node.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(node.id);
                  }
                  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                    event.preventDefault();
                    focusNode(Math.min(blocks.length - 1, node.index + 1));
                  }
                  if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                    event.preventDefault();
                    focusNode(Math.max(0, node.index - 1));
                  }
                }}
              >
                <title>{node.label}</title>
                <rect x={node.x - layout.nodeWidth / 2} y={node.y - layout.nodeHeight / 2} width={layout.nodeWidth} height={layout.nodeHeight} rx="16" fill="var(--color-background-card)" stroke={live || selected ? "var(--color-accent)" : "var(--color-border)"} strokeWidth={live ? "5" : selected ? "4" : "2"} />
                <circle cx={node.x - layout.nodeWidth / 2 + 24} cy={node.y - layout.nodeHeight / 2 + 24} r="14" fill={live ? "var(--color-accent)" : "var(--color-background-muted)"} />
                <text x={node.x - layout.nodeWidth / 2 + 24} y={node.y - layout.nodeHeight / 2 + 29} textAnchor="middle" fill={live ? "var(--color-on-accent)" : "var(--color-text-primary)"} fontSize="var(--font-size-sm)" fontWeight="var(--font-weight-semibold)">{node.index + 1}</text>
                <text x={node.x} y={node.labelLines.length === 1 ? node.y - 12 : node.y - 22} textAnchor="middle" fill="var(--color-text-primary)" fontSize="var(--font-size-base)" fontWeight="var(--font-weight-semibold)">
                  {node.labelLines.map((line, lineIndex) => <tspan key={`${node.id}-line-${lineIndex}`} x={node.x} dy={lineIndex === 0 ? 0 : 18}>{line}</tspan>)}
                </text>
                <text x={node.x} y={node.y + 31} textAnchor="middle" fill="var(--color-text-secondary)" fontSize="var(--font-size-sm)">{live ? "지금 이야기 중" : formatTime(node.start)} · {node.segments.length}개 발화</text>
              </g>
            );
          })}
        </svg>
      </Card>
      <TopicEvidence block={blocks.find(({ id }) => id === selectedId)} />
    </Stack>
  );
}

function MeetingMindMap({ blocks, compact, selectedId, onSelect }) {
  const nodeRefs = useRef(new Map());
  if (!blocks.length) {
    return <Banner status="info" title="첫 발화를 기다리는 중" description="대화가 들어오면 중심 주제와 발화 구간이 연결됩니다." />;
  }
  const layout = buildMindMapLayout(blocks, selectedId, { maximumVisible: compact ? 12 : 18 });
  const { centerX, centerY, height, nodeHeight, nodeWidth, nodes, selectedIndex, width } = layout;
  const focusNode = (targetIndex) => {
    const target = blocks[targetIndex];
    if (!target) return;
    onSelect(target.id);
    window.requestAnimationFrame(() => nodeRefs.current.get(target.id)?.focus());
  };
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
      {blocks.length > nodes.length && (
        <Banner status="info" title={`전체 ${blocks.length}개 중 선택 주제 주변 ${nodes.length}개를 표시합니다.`} description="이전·다음 주제로 이동하면 마인드맵 표시 범위도 함께 이동합니다. 트리 보기에서는 전체 계층을 한 번에 탐색할 수 있습니다." />
      )}
      <Card variant="muted" padding={compact ? 1 : 3} style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${width} ${height}`} width={compact ? 760 : "100%"} height={compact ? Math.round(height * 0.76) : height} role="group" aria-label={`전체 ${blocks.length}개 중 ${nodes.length}개 주제를 표시한 실제 회의 마인드맵`}>
        <title>실제 발화 근거로 구성한 회의 마인드맵</title>
        {nodes.map((node) => (
          <path
            key={`line-${node.id}`}
            d={node.side === "left"
              ? `M ${centerX - 90} ${centerY} C ${centerX - 210} ${centerY}, ${node.x + nodeWidth / 2 + 70} ${node.y}, ${node.x + nodeWidth / 2} ${node.y}`
              : `M ${centerX + 90} ${centerY} C ${centerX + 210} ${centerY}, ${node.x - nodeWidth / 2 - 70} ${node.y}, ${node.x - nodeWidth / 2} ${node.y}`}
            fill="none"
            stroke="var(--color-border-emphasized)"
            strokeWidth="2"
          />
        ))}
        <g>
          <rect x={centerX - 90} y={centerY - 38} width="180" height="76" rx="20" fill="var(--color-accent)" />
          <text x={centerX} y={centerY - 4} textAnchor="middle" fill="var(--color-on-accent)" fontSize="var(--font-size-lg)" fontWeight="var(--font-weight-semibold)">현재 회의</text>
          <text x={centerX} y={centerY + 21} textAnchor="middle" fill="var(--color-on-accent)" fontSize="var(--font-size-sm)">{blocks.reduce((sum, block) => sum + block.segments.length, 0)}개 실제 발화</text>
        </g>
        {nodes.map((node) => (
          <g
            key={node.id}
            ref={(element) => {
              if (element) nodeRefs.current.set(node.id, element);
              else nodeRefs.current.delete(node.id);
            }}
            role="button"
            tabIndex={node.globalIndex === selectedIndex ? 0 : -1}
            cursor="pointer"
            aria-label={`${node.globalIndex + 1}번째 주제 ${node.label}, ${formatTime(node.start)}, 발화 ${node.segments.length}개`}
            aria-pressed={node.globalIndex === selectedIndex}
            onClick={() => onSelect(node.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(node.id);
              }
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                focusNode(Math.min(blocks.length - 1, node.globalIndex + 1));
              }
              if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                focusNode(Math.max(0, node.globalIndex - 1));
              }
            }}
          >
            <title>{node.label}</title>
            <rect x={node.x - nodeWidth / 2} y={node.y - nodeHeight / 2} width={nodeWidth} height={nodeHeight} rx="16" fill="var(--color-background-card)" stroke={node.globalIndex === selectedIndex ? "var(--color-accent)" : "var(--color-border)"} strokeWidth={node.globalIndex === selectedIndex ? "4" : "2"} />
            <text x={node.x} y={node.labelLines.length === 1 ? node.y - 7 : node.y - 15} textAnchor="middle" fill="var(--color-text-primary)" fontSize="var(--font-size-base)" fontWeight="var(--font-weight-semibold)">
              {node.labelLines.map((line, lineIndex) => <tspan key={`${node.id}-line-${lineIndex}`} x={node.x} dy={lineIndex === 0 ? 0 : 17}>{line}</tspan>)}
            </text>
            <text x={node.x} y={node.y + 23} textAnchor="middle" fill="var(--color-text-secondary)" fontSize="var(--font-size-sm)">
              {formatTime(node.start)} · {node.segments.length}개 발화
            </text>
          </g>
        ))}
      </svg>
      </Card>
      <TopicEvidence block={blocks[selectedIndex]} />
    </Stack>
  );
}

function RecordingFooter({ recording, compact, billing, onOpenBilling }) {
  const identifiesSpeakers = recording.mode === "speaker";
  const microphoneLevel = microphoneLevelPresentation(recording.audioLevel, recording.isRecording);
  const meetingLimitReached = billing?.usage?.meetings?.allowed === false;
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
            <Stack gap={1} width={compact ? "100%" : 180}>
              <ProgressBar label="마이크 입력 레벨" value={recording.audioLevel} isLabelHidden variant={microphoneLevel.variant} marks={recording.isRecording ? [{ value: 20, label: "적정 입력 시작" }, { value: 90, label: "과입력 시작" }] : undefined} />
              <Text type="supporting" color="secondary">{microphoneLevel.label}</Text>
            </Stack>
            <Selector
              label="입력 마이크"
              isLabelHidden
              value={recording.selectedAudioInputId}
              onChange={recording.setSelectedAudioInputId}
              options={[
                { value: "", label: "시스템 기본 마이크" },
                ...recording.audioInputs.map(({ deviceId, label }, index) => ({
                  value: deviceId,
                  label: label || `마이크 ${index + 1}`
                }))
              ]}
              isDisabled={recording.isRecording || recording.isBusy}
              disabledMessage="기록 중에는 입력 마이크를 바꿀 수 없습니다."
              width={compact ? "100%" : 220}
            />
            {identifiesSpeakers && <FileInput
              label="녹음 파일 전사"
              value={null}
              onChange={(file) => file && recording.transcribeFile(file)}
              accept="audio/*,video/mp4,video/webm"
              placeholder="파일에서 전사"
              isLabelHidden
              isLoading={recording.isBusy && !recording.isRecording}
              isDisabled={recording.isRecording || !recording.services.openai || meetingLimitReached}
              disabledMessage={recording.isRecording ? "기록 중에는 파일을 올릴 수 없습니다." : meetingLimitReached ? "현재 플랜의 회의 횟수를 모두 사용했습니다." : "서버에 OpenAI 전사 키가 설정되어 있지 않습니다."}
              width={compact ? "100%" : 220}
            />}
            <Button
              variant="primary"
              size="lg"
              label={recording.isRecording ? "기록 중지" : meetingLimitReached ? "플랜 한도 확인" : identifiesSpeakers ? "화자 식별 시작" : "STT 테스트 시작"}
              icon={<Icon icon={recording.isRecording ? "stop" : meetingLimitReached ? "info" : "microphone"} />}
              onClick={recording.isRecording ? recording.stop : meetingLimitReached ? onOpenBilling : recording.start}
              isLoading={recording.isBusy}
              width={compact ? "100%" : undefined}
            />
          </Stack>
        </Stack>
      </Section>
    </LayoutFooter>
  );
}

function LegacyMeetingPage({ context, recording, vocabularyTerms, onVocabularyRefresh, billing, onOpenBilling, onLeave, roomCode }) {
  const { compact, desktop } = useViewport();
  const [view, setView] = useState("tree");
  const [isInsightOpen, setInsightOpen] = useState(false);
  const [intelligence, setIntelligence] = useState(null);
  const [intelligenceBusy, setIntelligenceBusy] = useState(false);
  const [intelligenceNotice, setIntelligenceNotice] = useState("");
  const [knowledgeBusyTerm, setKnowledgeBusyTerm] = useState("");
  const [knowledgeAnswerBusy, setKnowledgeAnswerBusy] = useState("");
  const [knowledgeExplanations, setKnowledgeExplanations] = useState({});
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [followLiveStructure, setFollowLiveStructure] = useState(true);
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
  const selectStructureBlock = useCallback((blockId) => {
    setSelectedBlockId(blockId);
    setFollowLiveStructure(false);
  }, []);
  const tree = useMemo(() => analyzedStructure.tree.length ? analyzedStructure.tree.map((root) => ({
    ...root,
    children: (root.children || []).map((block) => ({
      ...block,
      isSelected: block.id === selectedBlockId,
      onClick: () => selectStructureBlock(block.id)
    }))
  })) : localTree.map((root) => ({
    ...root,
    children: (root.children || []).map((block) => ({
      ...block,
      isSelected: block.id === selectedBlockId,
      onClick: () => selectStructureBlock(block.id)
    }))
  })), [analyzedStructure.tree, localTree, selectStructureBlock, selectedBlockId]);
  const identifiesSpeakers = recording.mode === "speaker";
  const unverifiedSpeakerCount = recording.speakers.filter((speaker) => !speaker.crossSessionVerificationCount).length;
  const visibleNotice = !identifiesSpeakers && recording.notice.includes("목소리를 한 명 이상 등록") ? "" : recording.notice;

  useEffect(() => {
    if (!blocks.length) return setSelectedBlockId(null);
    if (recording.isRecording && followLiveStructure) return setSelectedBlockId(blocks.at(-1).id);
    if (!blocks.some(({ id }) => id === selectedBlockId)) setSelectedBlockId(recording.isRecording ? blocks.at(-1).id : blocks[0].id);
  }, [blocks, followLiveStructure, recording.isRecording, selectedBlockId]);

  useEffect(() => {
    setFollowLiveStructure(true);
  }, [recording.activeMeeting?.id]);

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
      if (result.meeting) recording.updateMeeting(result.meeting);
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
      options={TRANSCRIPTION_LANGUAGE_OPTIONS}
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

  const roomLink = `${window.location.origin}/record?room=${encodeURIComponent(roomCode)}`;
  const copyRoomInvitation = async () => {
    try {
      await navigator.clipboard.writeText(roomLink);
      setIntelligenceNotice("회의 링크를 복사했습니다.");
    } catch {
      setIntelligenceNotice("링크를 복사하지 못했습니다. 주소 표시줄에서 직접 복사해 주세요.");
    }
  };
  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setIntelligenceNotice("방 코드를 복사했습니다.");
    } catch {
      setIntelligenceNotice("방 코드를 복사하지 못했습니다.");
    }
  };
  const structureContent = view === "outline" ? (
    <StructureDiagram blocks={blocks} selectedId={selectedBlockId} onSelect={selectStructureBlock} isRecording={recording.isRecording} compact />
  ) : view === "mindmap" ? (
    <MeetingMindMap blocks={blocks} compact selectedId={selectedBlockId} onSelect={selectStructureBlock} />
  ) : view === "overview" ? (
    <MeetingOverview segments={displayedSegments} mode={recording.mode} intelligence={intelligence} terms={terms} actions={actions} />
  ) : (
    <Stack gap={3}>
      {tree.length ? <TreeList items={tree} density="compact" variant="lineGuides" /> : <List><ListItem label="첫 발화를 기다리는 중" description="음성이 들어오면 주제 구조가 이곳에 나타납니다." /></List>}
      {selectedBlockId && <TopicEvidence block={blocks.find(({ id }) => id === selectedBlockId)} />}
    </Stack>
  );

  return (
    <>
      <Layout
        height="fill"
        header={(
          <LayoutHeader height={68} hasDivider label="실시간 회의 헤더">
            <Stack direction="horizontal" align="center" width="100%" height="100%" paddingInline={4} gap={3}>
              <Stack style={{ flex: "none" }}>
                <Button label="회의 나가기" variant="secondary" size="sm" onClick={onLeave} />
              </Stack>
              <Stack direction="horizontal" justify="center" width="100%">
                <Stack direction="horizontal" gap={3} align="center" paddingInline={4} paddingBlock={2} style={{ borderRadius: "var(--radius-full)", background: "var(--color-background-muted)" }}>
                  <StatusDot variant="error" label="LIVE" isPulsing={recording.isRecording} />
                  {!compact && <Text type="supporting" color="secondary">방 코드</Text>}
                  <Text type="code" weight="semibold" style={{ fontSize: "var(--font-size-xl)", letterSpacing: "var(--spacing-1)" }}>{roomCode}</Text>
                  <Text type="code" color="secondary">{formatTime(recording.elapsed)}</Text>
                  <IconButton label="방 코드 복사" icon="copy" variant="ghost" size="sm" onClick={copyRoomCode} />
                </Stack>
              </Stack>
              <Stack direction="horizontal" gap={2} align="center" style={{ flex: "none" }}>
                {!compact && languageSelector}
                <Button label="내 이해" variant="ghost" size="sm" onClick={() => setInsightOpen(true)} />
              </Stack>
            </Stack>
          </LayoutHeader>
        )}
        content={(
        <LayoutContent padding={compact ? 2 : 3} style={{ overflow: "hidden", background: "var(--color-background-body)" }}>
          <Stack gap={3} height="100%">
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
            {billing?.usage?.meetings?.allowed === false && (
              <Banner
                status="warning"
                title={`${billing.subscription.planId} 플랜의 현재 기간 회의 횟수를 모두 사용했습니다.`}
                description="기존 회의 문서는 계속 열람할 수 있으며 새 녹음과 파일 전사는 다음 기간 또는 플랜 변경 후 사용할 수 있습니다."
                endContent={<Button label="플랜 보기" variant="secondary" size="sm" onClick={onOpenBilling} />}
              />
            )}
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
            <Stack direction={compact ? "vertical" : "horizontal"} gap={3} height="100%" style={{ minHeight: 0 }}>
              <Card padding={0} width={compact ? "100%" : "calc(var(--spacing-10) * 10 - var(--spacing-2))"} style={{ flex: "none", overflow: "hidden", minHeight: 0 }}>
                <Stack height="100%" style={{ minHeight: 0 }}>
                  <Section padding={3} dividers={["bottom"]}>
                    <Stack gap={2}>
                      <Stack direction="horizontal" justify="between" align="center">
                        <Stack gap={0.5}><Text type="label" color="accent" weight="semibold">CONVERSATION STRUCTURE</Text><Heading level={3}>회의 구조</Heading></Stack>
                        {recording.isRecording && !followLiveStructure && <Button label="현재" variant="ghost" size="sm" onClick={() => setFollowLiveStructure(true)} />}
                      </Stack>
                      <Selector label="구조 보기" isLabelHidden value={view} onChange={setView} options={MEETING_VIEW_OPTIONS.filter(({ value }) => value !== "transcript")} width="100%" />
                    </Stack>
                  </Section>
                  <Stack isScrollable padding={3} height="100%" style={{ minHeight: 0 }}>{structureContent}</Stack>
                </Stack>
              </Card>

              <Card padding={0} width="100%" style={{ overflow: "hidden", minHeight: 0 }}>
                <Stack height="100%" style={{ position: "relative", minHeight: 0 }}>
                  <Section padding={3} dividers={["bottom"]}>
                    <Stack direction={compact ? "vertical" : "horizontal"} justify="between" align={compact ? "stretch" : "center"} gap={2}>
                      <Stack gap={0.5}><Text type="label" color="accent" weight="semibold">LIVE TRANSCRIPT</Text><Heading level={3}>실시간 음성 인식</Heading></Stack>
                      <Stack direction="horizontal" gap={2} align="center">
                        <Text type="supporting" color="secondary">{displayedSegments.length}개 발화</Text>
                        {recording.activeMeeting && displayedSegments.length > 0 && !recording.isRecording && (
                          <Button label={intelligence ? "다시 분석" : "AI로 정리"} variant="secondary" size="sm" icon={<Icon icon="wrench" />} onClick={analyzeMeeting} isLoading={intelligenceBusy} isDisabled={recording.isBusy} />
                        )}
                      </Stack>
                    </Stack>
                  </Section>
                  <Stack isScrollable height="100%" padding={4} paddingBlockEnd={10} style={{ minHeight: 0 }}>
                    <TranscriptList segments={displayedSegments} speakers={recording.speakers} onCorrectSpeaker={recording.correctSpeaker} onCorrectText={recording.correctTranscript} compact={compact} mode={recording.mode} termCatalog={vocabularyTerms} />
                  </Stack>
                  {!compact && (
                    <Card padding={3} style={{ position: "absolute", insetInlineEnd: "var(--spacing-4)", bottom: "var(--spacing-4)", boxShadow: "var(--shadow-high)" }}>
                      <Stack direction="horizontal" gap={3} align="center">
                        <Stack gap={0.5}><Text type="label" color="secondary">방 코드</Text><Text type="code" weight="semibold" style={{ fontSize: "var(--font-size-xl)", letterSpacing: "var(--spacing-1)" }}>{roomCode}</Text></Stack>
                        <Stack width="var(--spacing-0-5)" height="var(--spacing-10)" style={{ background: "var(--color-border)" }} />
                        <Stack gap={0.5}><Text type="supporting" color="secondary" maxLines={1}>{roomLink}</Text><Button label="초대 링크 복사" variant="ghost" size="sm" icon={<Icon icon="copy" />} onClick={copyRoomInvitation} /></Stack>
                      </Stack>
                    </Card>
                  )}
                </Stack>
              </Card>
            </Stack>
          </Stack>
        </LayoutContent>
        )}
        footer={<RecordingFooter recording={recording} compact={compact} billing={billing} onOpenBilling={onOpenBilling} />}
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

function LiveTranscriptFeed({ segments, isRecording, reducedMotion }) {
  const viewportRef = useRef(null);
  const followsLatestRef = useRef(true);
  const latestSegment = segments.at(-1);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !followsLatestRef.current) return;
    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: reducedMotion ? "auto" : "smooth"
    });
  }, [latestSegment?.text, latestSegment?.pending, segments.length, reducedMotion]);

  const updateFollowState = (event) => {
    const viewport = event.currentTarget;
    followsLatestRef.current = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 72;
  };

  return (
    <Stack
      ref={viewportRef}
      isScrollable
      height="100%"
      onScroll={updateFollowState}
      style={{ minHeight: 0, scrollBehavior: reducedMotion ? "auto" : "smooth" }}
    >
      <List
        hasDividers
        density="spacious"
        header={(
          <Stack padding={4} style={{ borderBottom: "var(--border-width) solid var(--color-border)" }}>
            <Stack direction="horizontal" justify="between" align="center" gap={3}>
              <Heading level={2}>대화 내용</Heading>
              <Text type="supporting" color="secondary" style={{ whiteSpace: "nowrap" }}>{segments.length}개 발화</Text>
            </Stack>
          </Stack>
        )}
      >
        {segments.length ? segments.map((segment, index) => (
          <ListItem
            key={segment.id || `${segment.start}-${index}`}
            label={(
              <Stack direction="horizontal" align="center" gap={2}>
                <Text weight="semibold">{segment.speaker || "화자"}</Text>
                {segment.pending && <StatusDot variant="accent" label="인식 중" isPulsing />}
              </Stack>
            )}
            description={(
              <Text as="p" type="large" color={segment.pending ? "secondary" : "primary"} style={{ wordBreak: "keep-all", overflowWrap: "break-word" }}>
                {segment.text}
              </Text>
            )}
            endContent={<Text type="code" color="secondary">{formatTime(segment.start)}</Text>}
          />
        )) : (
          <ListItem
            label={isRecording ? "말씀해 주세요" : "아직 기록된 문장이 없습니다"}
            description={isRecording ? "듣고 있는 문장이 이곳에서 계속 업데이트됩니다." : "오른쪽 위 마이크 버튼을 누르면 실시간 받아쓰기가 시작됩니다."}
            startContent={<StatusDot variant={isRecording ? "error" : "neutral"} label={isRecording ? "듣는 중" : "대기 중"} isPulsing={isRecording} />}
          />
        )}
      </List>
    </Stack>
  );
}

function LiveStructurePanel({ segments, isRecording }) {
  const trees = useMemo(() => buildDialogueMapTrees(segments), [segments]);
  const layout = useMemo(() => buildDialogueMapLayout(trees), [trees]);
  const activeNodeId = isRecording ? trees.at(-1)?.children.at(-1)?.id : null;
  const presentation = {
    topic: { fill: "var(--color-background-muted)", stroke: "var(--color-border-emphasized)", text: "var(--color-text-primary)", label: "주제" },
    question: { fill: "var(--color-background-yellow)", stroke: "var(--color-border-yellow)", text: "var(--color-text-yellow)", symbol: "?", label: "질문" },
    idea: { fill: "var(--color-background-blue)", stroke: "var(--color-border-blue)", text: "var(--color-text-blue)", symbol: "✦", label: "아이디어" },
    pro: { fill: "var(--color-background-green)", stroke: "var(--color-border-green)", text: "var(--color-text-green)", symbol: "+", label: "장점" },
    con: { fill: "var(--color-background-red)", stroke: "var(--color-border-red)", text: "var(--color-text-red)", symbol: "−", label: "우려" }
  };

  return (
    <Stack data-live-structure-panel height="100%" style={{ minHeight: 0 }}>
      <Stack padding={5} style={{ borderBottom: "var(--border-width) solid var(--color-border)" }}>
        <Stack direction="horizontal" justify="between" align="center" gap={3}>
          <Heading level={2}>구조도</Heading>
          <StatusDot
            variant={isRecording ? "error" : "neutral"}
            label={isRecording ? "분석 중" : `${trees.length}개 주제`}
            isPulsing={isRecording}
          />
        </Stack>
      </Stack>
      <Stack isScrollable height="100%" padding={3} style={{ minHeight: 0, background: "var(--color-background-muted)" }}>
        {trees.length ? (
          <svg
            data-dialogue-tree
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            width="100%"
            height={layout.height}
            role="img"
            aria-label={`${trees.length}개 주제와 ${layout.nodes.length - trees.length}개 발화를 연결한 대화 구조도`}
            style={{ display: "block", flex: "none" }}
          >
            <title>실제 발화에서 생성한 대화 구조도</title>
            <defs>
              <marker id="dialogue-tree-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-border-blue)" />
              </marker>
            </defs>
            {layout.edges.map((edge) => (
              <path
                key={edge.id}
                d={edge.path}
                fill="none"
                stroke="var(--color-border-blue)"
                strokeWidth="var(--border-width)"
                markerEnd="url(#dialogue-tree-arrow)"
              />
            ))}
            {layout.nodes.map((node) => {
              const colors = presentation[node.kind] || presentation.idea;
              const live = node.pending || node.id === activeNodeId;
              const symbol = node.kind === "topic" ? String(node.topicIndex + 1) : colors.symbol;
              return (
                <g key={node.id} aria-label={`${colors.label} ${node.label}`}>
                  <rect
                    x={node.x}
                    y={node.y}
                    width={node.width}
                    height={node.height}
                    rx="var(--radius-element)"
                    fill={colors.fill}
                    stroke={live ? "var(--color-accent)" : colors.stroke}
                    strokeWidth={live ? "var(--spacing-0-5)" : "var(--border-width)"}
                  />
                  <circle cx={node.x + 20} cy={node.y + 22} r="11" fill={colors.stroke} />
                  <text x={node.x + 20} y={node.y + 26} textAnchor="middle" fill="var(--color-background-surface)" fontSize="var(--font-size-sm)" fontWeight="var(--font-weight-bold)">{symbol}</text>
                  <text x={node.x + 42} y={node.y + 22} fill="var(--color-text-primary)" fontSize="var(--font-size-sm)" fontWeight="var(--font-weight-semibold)">
                    {node.labelLines.map((line, lineIndex) => <tspan key={`${node.id}-line-${lineIndex}`} x={node.x + 42} dy={lineIndex === 0 ? 0 : 16}>{line}</tspan>)}
                  </text>
                  <text x={node.x + 42} y={node.y + 60} fill="var(--color-text-secondary)" fontSize="var(--font-size-xs)">{node.meta}</text>
                  {live && <circle cx={node.x + node.width - 14} cy={node.y + 14} r="4" fill="var(--color-accent)" />}
                </g>
              );
            })}
          </svg>
        ) : (
          <Center width="100%" height="100%" padding={6}>
            <EmptyState
              isCompact
              icon={<Icon icon="microphone" />}
              title={isRecording ? "첫 주제를 찾고 있습니다" : "아직 구조화할 대화가 없습니다"}
              description={isRecording ? "발화가 이어지면 주제 트리가 자동으로 추가됩니다." : "녹음을 시작하면 실제 대화 순서대로 구조가 만들어집니다."}
            />
          </Center>
        )}
      </Stack>
    </Stack>
  );
}

function MeetingPage({ recording, billing, onOpenBilling, onLeave, roomCode, user }) {
  const { desktop, reducedMotion } = useViewport();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copyNotice, setCopyNotice] = useState("");
  const displayedSegments = recording.segments;
  const meetingLimitReached = billing?.usage?.meetings?.allowed === false;
  const roomLink = `${window.location.origin}/record?room=${encodeURIComponent(roomCode)}`;
  const transition = reducedMotion ? "none" : "all var(--duration-medium) var(--motion-navigation-ease)";

  const copyText = async (value, successMessage) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyNotice(successMessage);
    } catch {
      setCopyNotice("복사하지 못했습니다. 다시 시도해 주세요.");
    }
    window.setTimeout(() => setCopyNotice(""), 1800);
  };

  const toggleRecording = () => {
    if (recording.isRecording) return recording.stop();
    if (meetingLimitReached) return onOpenBilling();
    return recording.start();
  };

  return (
    <Layout
      height="fill"
      header={(
        <LayoutHeader height={64} hasDivider label="실시간 받아쓰기 헤더">
          <Toolbar
            label="실시간 받아쓰기 도구"
            size="lg"
            startContent={!desktop ? <IconButton label="회의 나가기" icon={<Icon icon="chevronLeft" />} variant="ghost" onClick={onLeave} /> : undefined}
            centerContent={(
              <Stack direction="horizontal" align="center" gap={2}>
                <StatusDot variant={recording.isRecording ? "error" : "neutral"} label={recording.isRecording ? "녹음 중" : "대기 중"} isPulsing={recording.isRecording} />
                <Text type="code" weight="semibold" style={{ fontSize: "var(--font-size-xl)", fontVariantNumeric: "tabular-nums" }}>
                  {formatTime(recording.elapsed)}
                </Text>
              </Stack>
            )}
            endContent={!desktop ? (
              <IconButton
                label={recording.isRecording ? "기록 중지" : meetingLimitReached ? "플랜 한도 확인" : "기록 시작"}
                icon={<Icon icon={recording.isRecording ? "stop" : meetingLimitReached ? "info" : "microphone"} />}
                variant={recording.isRecording ? "destructive" : "primary"}
                onClick={toggleRecording}
                isLoading={recording.isBusy}
              />
            ) : undefined}
          />
        </LayoutHeader>
      )}
      content={(
        <LayoutContent padding={desktop ? 6 : 0} style={{ minHeight: 0, overflow: "hidden", background: desktop ? "var(--color-background-body)" : "var(--color-background-surface)" }}>
          {desktop ? (
            <Stack data-desktop-meeting-workspace direction="horizontal" gap={4} height="100%" style={{ minHeight: 0 }}>
              <Stack
                width="32%"
                height="100%"
                style={{ overflow: "hidden", borderRadius: "var(--radius-container)", background: "var(--color-background-surface)", boxShadow: "var(--shadow-low)", flex: "none", minHeight: 0 }}
              >
                <LiveStructurePanel segments={displayedSegments} isRecording={recording.isRecording} />
              </Stack>
              <Stack
                width="100%"
                height="100%"
                style={{ overflow: "hidden", borderRadius: "var(--radius-container)", background: "var(--color-background-surface)", boxShadow: "var(--shadow-low)", minWidth: 0, minHeight: 0 }}
              >
                <LiveTranscriptFeed segments={displayedSegments} isRecording={recording.isRecording} reducedMotion={reducedMotion} />
              </Stack>
            </Stack>
          ) : (
            <Stack height="100%" style={{ minHeight: 0 }}>
              {recording.notice && (
                <Section padding={3} dividers={["bottom"]}>
                  <Text type="supporting" color="secondary">{recording.notice}</Text>
                </Section>
              )}
              <LiveTranscriptFeed segments={displayedSegments} isRecording={recording.isRecording} reducedMotion={reducedMotion} />
            </Stack>
          )}
        </LayoutContent>
      )}
      footer={desktop ? (
        <LayoutFooter label="회의 제어">
          <Stack data-desktop-meeting-controls width="100%" paddingInline={6} paddingBlock={4} style={{ background: "var(--color-background-body)" }}>
            <Toolbar
              label="데스크톱 회의 제어"
              size="lg"
              startContent={(
                <Button
                  label="회의 나가기"
                  icon={<Icon icon="chevronLeft" />}
                  variant="ghost"
                  onClick={onLeave}
                  style={{ color: "var(--color-text-red)" }}
                />
              )}
              centerContent={(
                <Card padding={3} style={{ borderRadius: "var(--radius-full)", boxShadow: "var(--shadow-med)" }}>
                  <Stack data-meeting-participant-control direction="horizontal" align="center" gap={3}>
                    <Avatar name={user?.name || "나"} size="lg" />
                    <Stack gap={0.5} width="calc(var(--spacing-10) * 5)" style={{ minWidth: 0 }}>
                      <Text weight="semibold" maxLines={1}>{user?.name || "나"}</Text>
                      <Text type="supporting" color="secondary" maxLines={1}>{user?.vocabulary?.roles?.[0] || "회의 참가자"}</Text>
                    </Stack>
                    <IconButton
                      label={recording.isRecording ? "기록 중지" : meetingLimitReached ? "플랜 한도 확인" : "기록 시작"}
                      tooltip={recording.isRecording ? "기록 중지" : "기록 시작"}
                      icon={<Icon icon={recording.isRecording ? "stop" : meetingLimitReached ? "info" : "microphone"} />}
                      variant={recording.isRecording ? "destructive" : "primary"}
                      size="lg"
                      onClick={toggleRecording}
                      isLoading={recording.isBusy}
                    />
                  </Stack>
                </Card>
              )}
              endContent={(
                <Stack
                  data-room-invite-panel
                  width="calc(var(--spacing-10) * 9)"
                  style={{
                    maxHeight: inviteOpen ? "calc(var(--spacing-10) * 5)" : "calc(var(--spacing-10) + var(--spacing-4))",
                    overflow: "hidden",
                    borderRadius: "var(--radius-container)",
                    background: "var(--color-background-surface)",
                    boxShadow: "var(--shadow-low)",
                    transition
                  }}
                >
                  <Stack
                    as="button"
                    type="button"
                    direction="horizontal"
                    align="center"
                    justify="between"
                    gap={3}
                    width="100%"
                    height="calc(var(--spacing-10) + var(--spacing-4))"
                    paddingInline={4}
                    onClick={() => setInviteOpen((open) => !open)}
                    aria-expanded={inviteOpen}
                    style={{ border: 0, background: "transparent", color: "inherit", cursor: "pointer", textAlign: "start", flex: "none" }}
                  >
                    <Stack gap={0.5}>
                      <Text type="supporting" color="secondary">방 코드</Text>
                      <Text type="code" weight="semibold" style={{ fontSize: "var(--font-size-xl)", letterSpacing: "var(--spacing-1)" }}>{roomCode}</Text>
                    </Stack>
                    <Stack direction="horizontal" gap={2} align="center">
                      <Text type="supporting" color="secondary">링크</Text>
                      <Stack style={{ transform: inviteOpen ? "rotate(180deg)" : "rotate(0deg)", transition }}>
                        <Icon icon="chevronDown" color="secondary" />
                      </Stack>
                    </Stack>
                  </Stack>
                  <Stack paddingInline={4} paddingBlockEnd={4} gap={3} style={{ opacity: inviteOpen ? 1 : 0, transform: inviteOpen ? "translateY(0)" : "translateY(var(--spacing-4))", transition }}>
                    <Text type="supporting" color="secondary" maxLines={1}>{roomLink}</Text>
                    <Stack direction="horizontal" gap={2}>
                      <Button label="코드 복사" icon={<Icon icon="copy" />} variant="secondary" width="100%" onClick={() => copyText(roomCode, "방 코드를 복사했습니다.")} />
                      <Button label="링크 복사" icon={<Icon icon="link" />} variant="primary" width="100%" onClick={() => copyText(roomLink, "초대 링크를 복사했습니다.")} />
                    </Stack>
                    {copyNotice && <Text type="supporting" color="accent">{copyNotice}</Text>}
                  </Stack>
                </Stack>
              )}
            />
          </Stack>
        </LayoutFooter>
      ) : (
        <LayoutFooter hasDivider label="회의 정보">
          <Stack
            data-room-invite-panel
            style={{
              maxHeight: inviteOpen ? "calc(var(--spacing-10) * 6)" : "calc(var(--spacing-10) + var(--spacing-3))",
              overflow: "hidden",
              background: "var(--color-background-surface)",
              transition
            }}
          >
            <Stack
              as="button"
              type="button"
              direction="horizontal"
              align="center"
              justify="between"
              gap={3}
              width="100%"
              height="calc(var(--spacing-10) + var(--spacing-3))"
              paddingInline={4}
              onClick={() => setInviteOpen((open) => !open)}
              aria-expanded={inviteOpen}
              style={{ border: 0, background: "transparent", color: "inherit", cursor: "pointer", textAlign: "start", flex: "none" }}
            >
              <Stack direction="horizontal" gap={2} align="center">
                <Stack width="var(--spacing-8)" height="var(--spacing-1)" style={{ borderRadius: "var(--radius-full)", background: "var(--color-border-emphasized)" }} />
                <Text weight="semibold">회의 정보</Text>
              </Stack>
              <Stack direction="horizontal" gap={2} align="center">
                <Text type="code" weight="semibold" style={{ letterSpacing: "var(--spacing-0-5)" }}>{roomCode}</Text>
                <Stack style={{ transform: inviteOpen ? "rotate(180deg)" : "rotate(0deg)", transition }}>
                  <Icon icon="chevronDown" color="secondary" />
                </Stack>
              </Stack>
            </Stack>

            <Stack paddingInline={4} paddingBlockEnd={4} gap={4} style={{ opacity: inviteOpen ? 1 : 0, transform: inviteOpen ? "translateY(0)" : "translateY(var(--spacing-4))", transition }}>
              <Stack direction="horizontal" justify="between" align="center" gap={3}>
                <Stack gap={0.5}>
                  <Text type="supporting" color="secondary">방 코드</Text>
                  <Text type="code" weight="semibold" style={{ fontSize: "var(--font-size-2xl)", letterSpacing: "var(--spacing-2)" }}>{roomCode}</Text>
                </Stack>
                <IconButton label="방 코드 복사" icon={<Icon icon="copy" />} variant="secondary" onClick={() => copyText(roomCode, "방 코드를 복사했습니다.")} />
              </Stack>
              <Stack gap={2}>
                <Text type="supporting" color="secondary" maxLines={1}>{roomLink}</Text>
                <Button label="초대 링크 복사" icon={<Icon icon="copy" />} variant="primary" width="100%" onClick={() => copyText(roomLink, "초대 링크를 복사했습니다.")} />
              </Stack>
              {copyNotice && <Text type="supporting" color="accent">{copyNotice}</Text>}
            </Stack>
          </Stack>
        </LayoutFooter>
      )}
    />
  );
}

function meetingDate(value) {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function LegacyDashboardPage({ context, onStart, onOpen, onNavigate, onLogout, recording }) {
  const { compact, reducedMotion } = useViewport();
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountTab, setAccountTab] = useState("bio");
  const [dockUp, setDockUp] = useState(false);
  const [code, setCode] = useState(["A", "7", "K", "2"]);
  const [motionPulse, setMotionPulse] = useState(false);
  const [profileIntroduction, setProfileIntroduction] = useState(() => window.localStorage.getItem(`voice-partition:bio:${context.user.id}`) || "");
  const [profileSaved, setProfileSaved] = useState(false);
  const codeRefs = useRef([]);
  const dockCollapseTimerRef = useRef(null);
  const recentMeetings = recording.meetings.slice(0, 6);
  const roles = context.user.vocabulary?.roles || [];
  const knownTerms = context.user.vocabulary?.knownTerms || [];
  const ready = code.every(Boolean);
  const nextCodeIndex = code.findIndex((character) => !character);
  const motion = reducedMotion ? "none" : "all var(--duration-slow) var(--motion-navigation-ease)";

  useEffect(() => () => window.clearTimeout(dockCollapseTimerRef.current), []);
  useEffect(() => {
    if (reducedMotion) return undefined;
    const timer = window.setInterval(() => setMotionPulse((current) => !current), 850);
    return () => window.clearInterval(timer);
  }, [reducedMotion]);

  const setCodeCharacter = (index, value) => {
    const character = String(value || "").replace(/[^a-zA-Z0-9]/g, "").slice(-1).toUpperCase();
    setCode((current) => current.map((item, itemIndex) => itemIndex === index ? character : item));
    if (character && index < codeRefs.current.length - 1) codeRefs.current[index + 1]?.focus();
  };
  const handleCodeKey = (index, event) => {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      setCode((current) => current.map((item, itemIndex) => itemIndex === index - 1 ? "" : item));
      codeRefs.current[index - 1]?.focus();
    }
    if (event.key === "Enter" && ready) onStart(code.join(""));
  };
  const scheduleDockCollapse = () => {
    window.clearTimeout(dockCollapseTimerRef.current);
    dockCollapseTimerRef.current = window.setTimeout(() => {
      const focusedCode = codeRefs.current.includes(document.activeElement);
      if (!focusedCode) setDockUp(false);
    }, 420);
  };

  const accountContent = accountTab === "bio" ? (
    <Stack gap={3}>
      <Text type="supporting" color="secondary">회의에서 내가 어떤 말을 알아듣는지 판단하는 데 쓰입니다.</Text>
      <TextArea
        label="나의 업무 배경"
        isLabelHidden
        value={profileIntroduction}
        onChange={(value) => { setProfileIntroduction(value); setProfileSaved(false); }}
        placeholder={roles.length ? `${roles.join(" · ")} 업무를 담당합니다. ${knownTerms.length ? `${knownTerms.slice(0, 6).join(", ")} 용어에 익숙합니다.` : "회의 중 낯선 용어는 쉽게 설명해 주세요."}` : "업무 역할과 익숙한 분야를 적어 주세요."}
        maxLength={300}
        width="100%"
      />
      <Stack direction="horizontal" justify="end">
        <Button label={profileSaved ? "저장됨" : "저장"} variant="primary" size="sm" onClick={() => { window.localStorage.setItem(`voice-partition:bio:${context.user.id}`, profileIntroduction); setProfileSaved(true); }} />
      </Stack>
    </Stack>
  ) : accountTab === "settings" ? (
    <Stack gap={3}>
      <TextInput label="표시 이름" value={context.user.name} onChange={() => undefined} isReadOnly width="100%" description="회의방과 문서에 이 이름으로 표시됩니다." />
      <Selector
        label="마이크"
        value={recording.selectedAudioInputId}
        onChange={recording.setSelectedAudioInputId}
        options={[{ value: "", label: "시스템 기본 마이크" }, ...recording.audioInputs.map(({ deviceId, label }, index) => ({ value: deviceId, label: label || `마이크 ${index + 1}` }))]}
        width="100%"
      />
      <Stack direction="horizontal" gap={3} align="center" padding={3} style={{ borderRadius: "var(--radius-container)", background: "var(--color-background-muted)" }}>
        <Text type="supporting" weight="semibold">입력 감도</Text>
        <ProgressBar label="마이크 입력 감도" value={recording.audioLevel} isLabelHidden />
        <Text type="supporting" color="secondary">{microphoneLevelPresentation(recording.audioLevel, true).label}</Text>
      </Stack>
    </Stack>
  ) : (
    <Stack gap={3}>
      <Card variant="muted" padding={3}>
        <Stack gap={0.5}>
          <Text weight="medium">{context.user.email}</Text>
          <Text type="supporting" color="secondary">{context.organization.name} 워크스페이스</Text>
        </Stack>
      </Card>
      <Stack direction={compact ? "vertical" : "horizontal"} gap={2}>
        <Button label="플랜 및 결제" variant="primary" onClick={() => onNavigate("billing")} />
        <Button label="로그아웃" variant="destructive" onClick={onLogout} />
        <Button label="돌아가기" variant="ghost" onClick={() => setAccountOpen(false)} />
      </Stack>
    </Stack>
  );

  return (
    <Layout
      content={(
        <LayoutContent
          padding={0}
          onPointerMove={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            if (event.clientY > bounds.top + bounds.height * 0.7) {
              window.clearTimeout(dockCollapseTimerRef.current);
              setDockUp(true);
            } else if (!codeRefs.current.includes(document.activeElement)) scheduleDockCollapse();
          }}
          onPointerLeave={scheduleDockCollapse}
          style={{ position: "relative", overflow: "hidden", background: "var(--color-background-surface)" }}
        >
          <Center width="100%" height="100%" padding={compact ? 3 : 0} style={{ alignItems: "flex-start" }}>
            <Stack width="100%" maxWidth="calc(var(--spacing-10) * 15)" gap={5} paddingBlock={compact ? 2 : 8}>
              <Card
                padding={0}
                data-home-account
                style={{
                  height: accountOpen ? "calc(var(--spacing-10) * 10 + var(--spacing-1))" : "calc(var(--spacing-8) * 3)",
                  overflow: "hidden",
                  boxShadow: accountOpen ? "var(--shadow-high)" : "var(--shadow-low)",
                  transition: motion
                }}
              >
                <Stack
                  as="button"
                  type="button"
                  direction="horizontal"
                  align="center"
                  gap={3}
                  width="100%"
                  height="calc(var(--spacing-8) * 3)"
                  paddingInline={5}
                  onClick={() => setAccountOpen((open) => !open)}
                  aria-expanded={accountOpen}
                  style={{ border: 0, background: "transparent", color: "inherit", cursor: "pointer", textAlign: "start", flex: "none" }}
                >
                  <Avatar name={context.user.name} size="lg" />
                  <Stack gap={0.5} width="100%">
                    <Heading level={3}>{context.user.name}</Heading>
                    <Text type="supporting" color="secondary" maxLines={1}>{roles.length ? roles.join(" · ") : "역할을 설정해 주세요"}</Text>
                  </Stack>
                  {!compact && !accountOpen && <Text type="supporting" color="secondary">눌러서 프로필 열기</Text>}
                  <Stack style={{ transform: accountOpen ? "rotate(180deg)" : "rotate(0deg)", transition: motion }}><Icon icon="chevronDown" color="secondary" /></Stack>
                </Stack>
                <Stack paddingInline={5} paddingBlockEnd={5} gap={3} style={{ opacity: accountOpen ? 1 : 0, transform: accountOpen ? "translateY(0)" : "translateY(calc(var(--spacing-2) * -1))", transition: motion, pointerEvents: accountOpen ? "auto" : "none" }}>
                  <SegmentedControl value={accountTab} onChange={setAccountTab} label="프로필 설정" layout="fill">
                    <SegmentedControlItem value="bio" label="자기소개" />
                    <SegmentedControlItem value="settings" label="세팅" />
                    <SegmentedControlItem value="account" label="계정" />
                  </SegmentedControl>
                  {accountContent}
                </Stack>
              </Card>

              <Stack gap={2} style={{ minHeight: 0 }}>
                <Stack direction="horizontal" justify="between" align="center" paddingInline={1}>
                  <Heading level={3}>참여한 회의</Heading>
                  <Text type="supporting" color="secondary">최근 {recentMeetings.length}건</Text>
                </Stack>
                <Stack
                  gap={2}
                  isScrollable
                  paddingInline={1}
                  paddingBlockEnd={10}
                  style={{ maxHeight: accountOpen ? "calc(var(--spacing-10) * 6)" : "calc(var(--spacing-10) * 13 + var(--spacing-6))", transition: motion }}
                >
                  {recentMeetings.length ? recentMeetings.map((meeting) => {
                    const status = meetingStatusPresentation(meeting.status);
                    const meetingCode = String(meeting.id || "MEET").replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase().padEnd(4, "V");
                    const participantNames = recording.speakers.length
                      ? recording.speakers.slice(0, Math.min(meeting.speakerCount || 1, 3)).map(({ name }) => name)
                      : [context.user.name];
                    return (
                      <Card key={meeting.id} padding={0} style={{ boxShadow: "var(--shadow-low)", flex: "none" }}>
                        <Stack as="button" type="button" direction="horizontal" align="center" gap={3} width="100%" padding={4} onClick={() => onOpen(meeting)} style={{ border: 0, background: "transparent", color: "inherit", cursor: "pointer", textAlign: "start" }}>
                          <Stack gap={0.5} width="100%">
                            <Text weight="semibold" maxLines={1}>{meeting.title}</Text>
                            <Text type="supporting" color="secondary" maxLines={1}>{meetingDate(meeting.startedAt)} · {meeting.segmentCount}개 발화</Text>
                          </Stack>
                          {!compact && <AvatarGroup size="sm">{participantNames.map((name, index) => <Avatar key={`${name}-${index}`} name={name} />)}</AvatarGroup>}
                          <Text type="supporting" color="secondary">{meeting.speakerCount || 1}명</Text>
                          {!compact && <Text type="code" color="secondary" style={{ background: "var(--color-background-muted)", borderRadius: "var(--radius-inner)", padding: "var(--spacing-1) var(--spacing-2)" }}>{meetingCode}</Text>}
                          <Token label={status.label} color={status.color} size="sm" />
                        </Stack>
                      </Card>
                    );
                  }) : (
                    <Card padding={4} style={{ boxShadow: "var(--shadow-low)" }}>
                      <Stack direction="horizontal" gap={3} align="center">
                        <Icon icon="microphone" color="secondary" />
                        <Stack gap={0.5}><Text weight="semibold">아직 참여한 회의가 없습니다</Text><Text type="supporting" color="secondary">아래 방 코드에서 Enter를 눌러 첫 기록을 시작하세요.</Text></Stack>
                      </Stack>
                    </Card>
                  )}
                </Stack>
              </Stack>
            </Stack>
          </Center>

          <Card
            padding={0}
            data-home-dock
            onPointerEnter={() => { window.clearTimeout(dockCollapseTimerRef.current); setDockUp(true); }}
            onPointerLeave={scheduleDockCollapse}
            style={{
              position: "absolute",
              insetInlineStart: "50%",
              bottom: 0,
              width: compact ? "calc(100% - var(--spacing-6))" : "calc(var(--spacing-10) * 12)",
              marginInlineStart: compact ? "calc((100% - var(--spacing-6)) / -2)" : "calc(var(--spacing-10) * -6)",
              borderEndStartRadius: 0,
              borderEndEndRadius: 0,
              boxShadow: "var(--shadow-high)",
              transform: dockUp ? "translateY(0)" : "translateY(46%)",
              transition: reducedMotion ? "none" : "transform var(--duration-slow) var(--motion-navigation-ease), box-shadow var(--duration-medium) ease"
            }}
          >
            <Stack paddingInline={compact ? 3 : 4} paddingBlockStart={3} paddingBlockEnd={4} gap={3}>
              <Stack align="center"><Stack width="var(--spacing-10)" height="var(--spacing-1)" style={{ borderRadius: "var(--radius-full)", background: "var(--color-border-emphasized)" }} /></Stack>
              <Heading level={3}>방 코드</Heading>
              <Stack direction="horizontal" gap={3} align="center">
                <Stack direction="horizontal" gap={3} width="100%">
                  {code.map((character, index) => (
                    <Stack key={index} gap={2} width="100%">
                    <Stack
                      as="input"
                      ref={(element) => { codeRefs.current[index] = element; }}
                      aria-label={`방 코드 ${index + 1}번째 문자`}
                      value={character}
                      maxLength={1}
                      onChange={(event) => setCodeCharacter(index, event.target.value)}
                      onKeyDown={(event) => handleCodeKey(index, event)}
                      onFocus={() => { window.clearTimeout(dockCollapseTimerRef.current); setDockUp(true); }}
                      onBlur={scheduleDockCollapse}
                      width="100%"
                      height="calc(var(--spacing-10) + var(--spacing-4))"
                      style={{
                        minWidth: 0,
                        border: 0,
                        borderRadius: "var(--radius-element)",
                        background: character ? "var(--color-accent-muted)" : "var(--color-background-muted)",
                        boxShadow: index === nextCodeIndex && motionPulse
                          ? "inset 0 0 0 var(--spacing-0-5) var(--color-accent), 0 0 0 var(--spacing-1) var(--color-accent-muted)"
                          : `inset 0 0 0 var(--spacing-0-5) ${character ? "var(--color-accent)" : "var(--color-border)"}`,
                        color: "var(--color-text-primary)",
                        fontFamily: "var(--font-family-code)",
                        fontSize: "var(--font-size-xl)",
                        fontWeight: "var(--font-weight-medium)",
                        textAlign: "center",
                        textTransform: "uppercase",
                        outline: "none",
                        transform: ready ? "translateY(calc(var(--spacing-1) * -1))" : character ? "translateY(calc(var(--spacing-0-5) * -1))" : "translateY(0)",
                        transition: motion
                      }}
                    />
                      <Stack height="var(--spacing-0-5)" style={{ borderRadius: "var(--radius-full)", background: character ? "var(--color-accent)" : "var(--color-border)", opacity: index === nextCodeIndex && motionPulse ? 0.55 : 1, transition: motion }} />
                    </Stack>
                  ))}
                </Stack>
              </Stack>
            </Stack>
          </Card>
        </LayoutContent>
      )}
    />
  );
}

function meetingDurationLabel(duration) {
  const minutes = Math.max(1, Math.round((Number(duration) || 0) / 60));
  return `${minutes}분`;
}

function meetingRoomCode(meeting) {
  const explicitCode = meeting?.roomCode || meeting?.code;
  const source = explicitCode || meeting?.id || "MEET";
  return String(source).replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase().padEnd(4, "V");
}

function meetingParticipantSummary(meeting, fallbackName) {
  const explicit = Array.isArray(meeting?.participants) ? meeting.participants : [];
  const fromSegments = Array.isArray(meeting?.segments)
    ? meeting.segments.map(({ speaker }) => speaker).filter(Boolean)
    : [];
  const names = [...new Set([...explicit, ...fromSegments])];
  const visibleNames = (names.length ? names : [fallbackName]).slice(0, 3);
  const count = Number(meeting?.participantCount || meeting?.speakerCount) || Math.max(1, names.length);
  return { names: visibleNames, count };
}

function MeetingEntryScreen({ roomCode }) {
  return (
    <Layout height="fill" data-meeting-entry-loading>
      <LayoutContent padding={0} style={{ background: "var(--brand-cream)" }}>
        <Center width="100%" height="100%" padding={6}>
          <Stack align="center" gap={6} maxWidth={420}>
            <MascotArtwork kind="connecting" alt="회의실 연결을 준비하는 민트 캐릭터" size="calc(var(--spacing-10) * 3)" />
            <Stack align="center" gap={2}>
              <Heading level={1} type="display-3" textWrap="balance">회의실을 준비하고 있어요</Heading>
              <Text color="secondary" justify="center">마이크와 실시간 받아쓰기를 연결하는 중입니다.</Text>
            </Stack>
            <Stack direction="horizontal" gap={3} align="center">
              <Spinner size="lg" aria-label="회의실 연결 중" />
              <Text type="code" weight="semibold">{roomCode}</Text>
            </Stack>
          </Stack>
        </Center>
      </LayoutContent>
    </Layout>
  );
}

function DashboardPage({ context, onStart, onOpen, onNavigate, onLogout, recording, entryPhase = "idle" }) {
  const { compact, reducedMotion } = useViewport();
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountTab, setAccountTab] = useState("bio");
  const [dockUp, setDockUp] = useState(false);
  const [code, setCode] = useState(["", "", "", ""]);
  const [profileIntroduction, setProfileIntroduction] = useState(() => window.localStorage.getItem(`voice-partition:bio:${context.user.id}`) || "");
  const [profileSaved, setProfileSaved] = useState(false);
  const codeRefs = useRef([]);
  const dockCollapseTimerRef = useRef(null);
  const recentMeetings = recording.meetings.slice(0, 8);
  const roles = context.user.vocabulary?.roles || [];
  const knownTerms = context.user.vocabulary?.knownTerms || [];
  const ready = code.every(Boolean);
  const nextCodeIndex = code.findIndex((character) => !character);
  const transition = reducedMotion ? "none" : "all var(--duration-slow) var(--motion-navigation-ease)";

  useEffect(() => () => window.clearTimeout(dockCollapseTimerRef.current), []);

  const setCodeCharacter = (index, value) => {
    const character = String(value || "").replace(/[^a-zA-Z0-9]/g, "").slice(-1).toUpperCase();
    setCode((current) => current.map((item, itemIndex) => itemIndex === index ? character : item));
    if (character && index < codeRefs.current.length - 1) codeRefs.current[index + 1]?.focus();
  };
  const handleCodeKey = (index, event) => {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      setCode((current) => current.map((item, itemIndex) => itemIndex === index - 1 ? "" : item));
      codeRefs.current[index - 1]?.focus();
    }
    if (event.key === "Enter" && ready) onStart(code.join(""));
  };
  const scheduleDockCollapse = () => {
    window.clearTimeout(dockCollapseTimerRef.current);
    dockCollapseTimerRef.current = window.setTimeout(() => {
      if (!codeRefs.current.includes(document.activeElement)) setDockUp(false);
    }, 360);
  };

  const accountContent = accountTab === "bio" ? (
    <Stack gap={3}>
      <Text type="supporting" color="secondary">업무 배경은 회의 중 낯선 용어의 설명 수준을 맞추는 데만 사용됩니다.</Text>
      <TextArea
        label="나의 업무 배경"
        value={profileIntroduction}
        onChange={(value) => { setProfileIntroduction(value); setProfileSaved(false); }}
        placeholder={roles.length ? `${roles.join(" · ")} 업무를 담당합니다. ${knownTerms.length ? `${knownTerms.slice(0, 6).join(", ")} 용어에 익숙합니다.` : "회의 중 낯선 용어는 쉽게 설명해 주세요."}` : "업무 역할과 익숙한 분야를 적어 주세요."}
        maxLength={300}
        width="100%"
      />
      <Stack direction="horizontal" justify="end">
        <Button label={profileSaved ? "저장됨" : "자기소개 저장"} variant="primary" size="sm" onClick={() => { window.localStorage.setItem(`voice-partition:bio:${context.user.id}`, profileIntroduction); setProfileSaved(true); }} />
      </Stack>
    </Stack>
  ) : accountTab === "settings" ? (
    <Stack gap={3}>
      <TextInput label="표시 이름" value={context.user.name} onChange={() => undefined} isReadOnly width="100%" />
      <Selector
        label="입력 마이크"
        value={recording.selectedAudioInputId}
        onChange={recording.setSelectedAudioInputId}
        options={[{ value: "", label: "시스템 기본 마이크" }, ...recording.audioInputs.map(({ deviceId, label }, index) => ({ value: deviceId, label: label || `마이크 ${index + 1}` }))]}
        width="100%"
      />
      <Stack direction="horizontal" gap={3} align="center" padding={3} style={{ borderRadius: "var(--radius-container)", background: "var(--color-background-muted)" }}>
        <StatusDot variant={microphoneLevelPresentation(recording.audioLevel, true).variant} label="입력 감도" />
        <ProgressBar label="마이크 입력 감도" value={recording.audioLevel} isLabelHidden />
        <Text type="supporting" color="secondary" maxLines={1}>{microphoneLevelPresentation(recording.audioLevel, true).label}</Text>
      </Stack>
    </Stack>
  ) : (
    <Stack gap={3}>
      <Section variant="muted" padding={3}>
        <Stack gap={0.5}>
          <Text weight="medium">{context.user.email}</Text>
          <Text type="supporting" color="secondary">{context.organization.name}</Text>
        </Stack>
      </Section>
      <Stack direction={compact ? "vertical" : "horizontal"} gap={2}>
        <Button label="플랜 및 결제" variant="primary" onClick={() => onNavigate("billing")} width={compact ? "100%" : undefined} />
        <Button label="로그아웃" variant="destructive" onClick={onLogout} width={compact ? "100%" : undefined} />
        <Button label="프로필 닫기" variant="ghost" onClick={() => setAccountOpen(false)} width={compact ? "100%" : undefined} />
      </Stack>
    </Stack>
  );

  return (
    <Layout
      height="fill"
      data-home-entry-phase={entryPhase}
      style={{
        transform: entryPhase === "exiting" ? "translateY(100%) scale(0.985)" : "translateY(0) scale(1)",
        transformOrigin: "center bottom",
        transition: reducedMotion ? "none" : "transform var(--duration-medium-max) var(--motion-navigation-ease)",
        pointerEvents: entryPhase === "idle" ? "auto" : "none"
      }}
      content={(
        <LayoutContent
          padding={0}
          onPointerMove={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            if (event.clientY > bounds.top + bounds.height * 0.82) {
              window.clearTimeout(dockCollapseTimerRef.current);
              setDockUp(true);
            } else if (!codeRefs.current.includes(document.activeElement)) scheduleDockCollapse();
          }}
          onPointerLeave={scheduleDockCollapse}
          style={{ position: "relative", overflow: "hidden", background: "var(--color-background-surface)" }}
        >
          <Center width="100%" height="100%" paddingInline={compact ? 3 : 5} style={{ alignItems: "flex-start" }}>
            <Stack width="100%" maxWidth="calc(var(--spacing-10) * 16)" height="100%" gap={4} paddingBlockStart={compact ? 3 : 6} paddingBlockEnd="calc(var(--spacing-10) * 3)" style={{ minHeight: 0 }}>
              <Card
                padding={0}
                data-home-account
                style={{
                  maxHeight: accountOpen ? "calc(var(--spacing-10) * 12)" : "calc(var(--spacing-8) * 3)",
                  overflow: "hidden",
                  boxShadow: accountOpen ? "var(--shadow-med)" : "var(--shadow-low)",
                  transition,
                  flex: "none"
                }}
              >
                <Stack
                  as="button"
                  type="button"
                  direction="horizontal"
                  align="center"
                  gap={3}
                  width="100%"
                  height="calc(var(--spacing-8) * 3)"
                  paddingInline={compact ? 4 : 5}
                  onClick={() => setAccountOpen((open) => !open)}
                  aria-expanded={accountOpen}
                  style={{ border: 0, background: "transparent", color: "inherit", cursor: "pointer", textAlign: "start", flex: "none" }}
                >
                  <Avatar name={context.user.name} size="lg" />
                  <Stack gap={0.5} width="100%" style={{ minWidth: 0 }}>
                    <Heading level={3} maxLines={1}>{context.user.name}</Heading>
                    <Text type="supporting" color="secondary" maxLines={1}>{roles.length ? roles.join(" · ") : "역할을 설정해 주세요"}</Text>
                  </Stack>
                  {!compact && !accountOpen && <Text type="supporting" color="secondary" style={{ whiteSpace: "nowrap" }}>프로필 열기</Text>}
                  <Stack style={{ transform: accountOpen ? "rotate(180deg)" : "rotate(0deg)", transition }}><Icon icon="chevronDown" color="secondary" /></Stack>
                </Stack>
                <Stack paddingInline={compact ? 4 : 5} paddingBlockEnd={5} gap={3} style={{ opacity: accountOpen ? 1 : 0, transform: accountOpen ? "translateY(0)" : "translateY(calc(var(--spacing-2) * -1))", transition, pointerEvents: accountOpen ? "auto" : "none" }}>
                  <SegmentedControl value={accountTab} onChange={setAccountTab} label="프로필 설정" layout="fill">
                    <SegmentedControlItem value="bio" label="자기소개" />
                    <SegmentedControlItem value="settings" label="마이크·이름" />
                    <SegmentedControlItem value="account" label="계정" />
                  </SegmentedControl>
                  {accountContent}
                </Stack>
              </Card>

              <Stack isScrollable height="100%" paddingBlockEnd={8} style={{ minHeight: 0 }}>
                <List
                  hasDividers
                  density="spacious"
                  header={(
                    <Stack direction="horizontal" justify="between" align="center" paddingInline={1} paddingBlockEnd={2}>
                      <Heading level={3}>참여한 회의</Heading>
                      <Text type="supporting" color="secondary" style={{ whiteSpace: "nowrap" }}>최근 {recentMeetings.length}건</Text>
                    </Stack>
                  )}
                >
                  {recentMeetings.length ? recentMeetings.map((meeting) => {
                    const participants = meetingParticipantSummary(meeting, context.user.name);
                    return (
                      <ListItem
                        key={meeting.id}
                        label={<Text weight="semibold" maxLines={1}>{meeting.title}</Text>}
                        description={`${meetingDate(meeting.startedAt)} · ${meetingDurationLabel(meeting.duration)}`}
                        onClick={() => onOpen(meeting)}
                        endContent={(
                          <Stack direction="horizontal" gap={2} align="center" style={{ flex: "none" }}>
                            {!compact && <AvatarGroup size="sm">{participants.names.map((name, index) => <Avatar key={`${name}-${index}`} name={name} />)}</AvatarGroup>}
                            <Text type="supporting" color="secondary" style={{ whiteSpace: "nowrap" }}>{participants.count}명</Text>
                            <Text type="code" color="secondary" style={{ whiteSpace: "nowrap", background: "var(--color-background-muted)", borderRadius: "var(--radius-inner)", padding: "var(--spacing-1) var(--spacing-2)" }}>{meetingRoomCode(meeting)}</Text>
                          </Stack>
                        )}
                      />
                    );
                  }) : (
                    <ListItem
                      label="아직 참여한 회의가 없습니다"
                      description="아래의 방 코드 입력창에서 첫 회의를 시작해 보세요."
                      startContent={<Avatar src={MASCOT_ART.empty} name="첫 회의 안내" size="md" tooltip={false} />}
                    />
                  )}
                </List>
              </Stack>
            </Stack>
          </Center>

          <Card
            padding={0}
            data-home-dock
            onPointerEnter={() => { window.clearTimeout(dockCollapseTimerRef.current); setDockUp(true); }}
            onPointerLeave={scheduleDockCollapse}
            style={{
              position: "absolute",
              insetInlineStart: "50%",
              bottom: 0,
              width: compact ? "calc(100% - var(--spacing-6))" : "calc(var(--spacing-10) * 11)",
              marginInlineStart: compact ? "calc((100% - var(--spacing-6)) / -2)" : "calc(var(--spacing-10) * -5.5)",
              borderEndStartRadius: 0,
              borderEndEndRadius: 0,
              boxShadow: "var(--shadow-high)",
              transform: dockUp ? "translateY(0)" : "translateY(68%)",
              transition: reducedMotion ? "none" : "transform var(--duration-slow) var(--motion-navigation-ease)"
            }}
          >
            <Stack paddingInline={compact ? 3 : 4} paddingBlockStart={2} paddingBlockEnd={4} gap={3}>
              <Stack align="center" gap={2}>
                <Stack width="var(--spacing-10)" height="var(--spacing-1)" style={{ borderRadius: "var(--radius-full)", background: "var(--color-border-emphasized)" }} />
                <Text weight="semibold">방 코드로 입장</Text>
              </Stack>
              <Stack direction="horizontal" gap={2} width="100%">
                {code.map((character, index) => (
                  <Stack
                    as="input"
                    key={index}
                    ref={(element) => { codeRefs.current[index] = element; }}
                    aria-label={`방 코드 ${index + 1}번째 문자`}
                    value={character}
                    placeholder="·"
                    maxLength={1}
                    onChange={(event) => setCodeCharacter(index, event.target.value)}
                    onKeyDown={(event) => handleCodeKey(index, event)}
                    onFocus={() => { window.clearTimeout(dockCollapseTimerRef.current); setDockUp(true); }}
                    onBlur={scheduleDockCollapse}
                    width="100%"
                    height="calc(var(--spacing-10) + var(--spacing-2))"
                    style={{
                      minWidth: 0,
                      border: 0,
                      borderRadius: "var(--radius-element)",
                      background: character ? "var(--color-accent-muted)" : "var(--color-background-muted)",
                      boxShadow: `inset 0 0 0 var(--spacing-0-5) ${index === nextCodeIndex ? "var(--color-accent)" : character ? "var(--color-accent)" : "var(--color-border)"}`,
                      color: "var(--color-text-primary)",
                      fontFamily: "var(--font-family-code)",
                      fontSize: "var(--font-size-xl)",
                      fontWeight: "var(--font-weight-semibold)",
                      textAlign: "center",
                      textTransform: "uppercase",
                      outline: "none",
                      transition
                    }}
                  />
                ))}
              </Stack>
            </Stack>
          </Card>
        </LayoutContent>
      )}
    />
  );
}

function DocumentsPage({ meetings, onOpen, onDelete }) {
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const remove = async () => {
    if (!deleteTarget || deleteBusy) return;
    setDeleteBusy(true);
    setFeedback("");
    try {
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setDeleteBusy(false);
    }
  };
  return (
    <>
      <Layout
        contentWidth={1040}
        header={<PageHeader title="회의 문서" description="구조, 전사, 용어와 액션을 한 문서에서 검토합니다." />}
        content={(
          <LayoutContent padding={6}>
            <Stack gap={6}>
              <Feedback message={feedback} onDismiss={() => setFeedback("")} />
              <List
                hasDividers
                density="spacious"
                header={(
                  <Stack direction="horizontal" justify="between" align="end" paddingBlockEnd={2}>
                    <Stack gap={1}>
                      <Heading level={2}>최근 문서</Heading>
                      <Text color="secondary">회의가 끝나면 한 줄씩 자동으로 쌓입니다.</Text>
                    </Stack>
                    <Text type="supporting" color="secondary">{meetings.length}개</Text>
                  </Stack>
                )}
              >
                {meetings.length ? meetings.map((meeting) => {
                  const status = meetingStatusPresentation(meeting.status);
                  const controls = (
                    <Stack direction="horizontal" gap={2} align="center">
                      <Token label={status.label} color={status.color} size="sm" />
                      <Button label={`${meeting.title} 삭제`} variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); setDeleteTarget(meeting); }} />
                    </Stack>
                  );
                  return <ListItem key={meeting.id} label={meeting.title} description={`${meetingDate(meeting.startedAt)} · ${meeting.mode === "stt" ? "STT 테스트" : `${meeting.speakerCount}명`} · ${meeting.segmentCount}개 발화`} startContent={<Icon icon="calendar" color="accent" />} endContent={controls} onClick={() => onOpen(meeting)} />;
                }) : <ListItem label="저장된 회의 문서가 없습니다" description="실시간 기록 또는 파일 전사를 완료하면 자동으로 생성됩니다." startContent={<Icon icon="search" color="secondary" />} />}
              </List>
            </Stack>
          </LayoutContent>
        )}
      />
      <Dialog isOpen={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open && !deleteBusy) setDeleteTarget(null); }} purpose="required" width={480}>
        <Layout
          header={<DialogHeader title="회의 문서를 삭제할까요?" subtitle={deleteTarget?.title || "선택한 회의"} />}
          content={<LayoutContent padding={4}><Text>전사, 구조 분석, 액션과 이 회의에서 추출된 조직 용어가 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.</Text></LayoutContent>}
          footer={<LayoutFooter hasDivider><Section padding={3}><Stack direction="horizontal" justify="end" gap={2}><Button label="취소" variant="secondary" onClick={() => setDeleteTarget(null)} isDisabled={deleteBusy} /><Button label="문서 삭제" variant="destructive" onClick={remove} isLoading={deleteBusy} /></Stack></Section></LayoutFooter>}
        />
      </Dialog>
    </>
  );
}

function DictionaryPage({ terms, onRefresh }) {
  const { compact } = useViewport();
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
      contentWidth={1040}
      header={<PageHeader title="개인 용어 사전" description="아는 용어는 설명을 접고, 낯선 용어에만 업무 관점의 풀이를 제공합니다." />}
      content={(
        <LayoutContent padding={6}>
          <Stack gap={6}>
            <Feedback message={feedback} status="warning" onDismiss={() => setFeedback("")} />
            <Section variant="muted" padding={4}>
              <Stack as="form" direction="horizontal" gap={2} align="end" onSubmit={addKnownTerm}>
                <TextInput label="내가 이미 아는 용어 추가" value={newTerm} onChange={setNewTerm} placeholder="실제 업무 용어 입력" width="100%" />
                <Button type="submit" label="아는 개념 추가" variant="primary" isLoading={Boolean(busyTerm) && busyTerm === newTerm.trim()} isDisabled={!newTerm.trim() || Boolean(busyTerm)} />
              </Stack>
            </Section>
            <List
              hasDividers
              density="spacious"
              header={<Stack gap={1} paddingBlockEnd={2}><Heading level={2}>회의에서 나온 용어</Heading><Text color="secondary">이해 상태는 본인에게만 보이며 직접 선택한 답을 우선합니다.</Text></Stack>}
            >
              {terms.length ? terms.map((term) => {
                const known = term.isKnown;
                const evidence = term.meetingCount ? `${term.meetingCount}개 회의 · ${term.occurrences}회 감지` : "직접 등록한 기지식";
                const percentage = Math.round((term.knowledge?.pKnown ?? (known ? 1 : 0.35)) * 100);
                const statusLabel = known ? "이해함" : term.knowledge?.status === "unknown" ? "설명 필요" : "학습 중";
                const action = <Button label={known ? "잘 모르겠어요" : "이제 알아요"} variant="ghost" size="sm" width={compact ? "100%" : undefined} isLoading={busyTerm === term.term} isDisabled={Boolean(busyTerm) && busyTerm !== term.term} onClick={() => submitEvidence(term.term, known ? "mark_unknown" : "mark_known")} />;
                return <ListItem
                  key={term.conceptId || term.term}
                  label={term.term}
                  description={<Stack gap={2}>{compact && <Stack direction="horizontal"><Token label={statusLabel} color={known ? "green" : term.knowledge?.status === "unknown" ? "red" : "yellow"} size="sm" /></Stack>}<Text type="supporting">{term.definition || "직접 등록한 개념입니다."} · {evidence}</Text><ProgressBar label={`이해 가능성 ${percentage}%`} value={percentage} hasValueLabel /><Text type="supporting">{term.knowledge?.evidenceCount ? `내 피드백 ${term.knowledge.evidenceCount}개 기반` : "초기 추정"}</Text>{compact && action}</Stack>}
                  startContent={compact ? undefined : <Token label={statusLabel} color={known ? "green" : term.knowledge?.status === "unknown" ? "red" : "yellow"} size="sm" />}
                  endContent={compact ? undefined : action}
                />;
              }) : <ListItem label="아직 축적된 용어가 없습니다" description="회의를 구조 분석하면 실제 발화에서 발견된 낯선 용어가 여기에 저장됩니다." startContent={<Icon icon="info" color="secondary" />} />}
            </List>
          </Stack>
        </LayoutContent>
      )}
    />
  );
}

function SettingsPage({ context, recording, billing, onOpenBilling }) {
  const { compact, desktop } = useViewport();
  const [members, setMembers] = useState([]);
  const [speakerName, setSpeakerName] = useState("");
  const [speakerFile, setSpeakerFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [sampleTarget, setSampleTarget] = useState(null);
  const [sampleFile, setSampleFile] = useState(null);
  const speakerLimitReached = Boolean(billing?.usage?.speakers && billing.usage.speakers.remaining <= 0);
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

  const promoteIdentificationSample = async () => {
    if (!identificationFile || !expectedSpeakerId || !identification?.verification?.recorded) return;
    setBusy(true);
    setFeedback("");
    try {
      const speaker = await recording.addSpeakerSample(expectedSpeakerId, identificationFile);
      setIdentification(null);
      setIdentificationFile(null);
      setExpectedSpeakerId("");
      setIndependentRecording(false);
      setFeedback(`${speaker.name}의 검증 음성을 추가 표본으로 반영했습니다.`);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Layout
        contentWidth={1120}
        header={<PageHeader title="설정" description="구성원과 회의에서 식별할 목소리를 관리합니다." />}
        content={(
        <LayoutContent padding={compact ? 3 : 6}>
          <Stack gap={6}>
            {feedback && <Feedback message={feedback} status={feedback.includes("등록했습니다") || feedback.includes("반영했습니다") || feedback.includes("복사") ? "success" : "info"} onDismiss={() => setFeedback("")} />}
            <Stack direction={desktop ? "horizontal" : "vertical"} gap={6} align="start">
              <Stack gap={6} width="100%">
            <Section paddingInline={compact ? 3 : 0}>
              <Stack gap={3}>
                <Heading level={2}>조직</Heading>
                <Section variant="muted" padding={4}>
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
                </Section>
                <List hasDividers header={<Heading level={3}>구성원</Heading>}>
                  {members.map((member) => <ListItem key={member.id} label={member.name} description={member.email} startContent={<Avatar name={member.name} size="sm" />} endContent={<Token label={member.role === "owner" ? "관리자" : "멤버"} color={member.role === "owner" ? "teal" : "default"} size="sm" />} />)}
                </List>
              </Stack>
            </Section>
            <Section paddingInline={compact ? 3 : 0}>
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
                {speakerLimitReached && <Banner status="warning" title="등록 화자 한도에 도달했습니다." description={`${billing.subscription.planId} 플랜은 화자를 ${billing.usage.speakers.limit}명까지 등록할 수 있습니다.`} endContent={<Button label="플랜 보기" variant="secondary" size="sm" onClick={onOpenBilling} />} />}
                <Card padding={4}>
                  <Stack as="form" onSubmit={enroll} gap={3}>
                    <FormLayout direction={compact ? "vertical" : "horizontal"} defaultOptionality="required">
                      <TextInput label="화자 이름" value={speakerName} onChange={setSpeakerName} isRequired width="100%" />
                      <FileInput label="참조 음성" value={speakerFile} onChange={setSpeakerFile} accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav" isRequired width="100%" />
                    </FormLayout>
                    <Stack direction="horizontal" justify="end">
                      <Button type="submit" variant="primary" label="목소리 등록" isLoading={busy} isDisabled={speakerLimitReached} />
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
                        {identification.verification?.attemptRecorded && identification.verification.expectedSpeakerScore != null && (
                          <Text type="supporting">선택한 실제 화자와의 유사도 {Math.round(identification.verification.expectedSpeakerScore * 100)}%</Text>
                        )}
                        {identification.verification?.reason === "enrollment_audio" && identification.verification.enrollmentAudioSimilarity != null && (
                          <Text type="supporting">등록 음성과 내용 일치도 {Math.round(identification.verification.enrollmentAudioSimilarity * 1000) / 10}% · 별도 녹음으로 인정하려면 재인코딩이나 편집본이 아닌 다른 시점의 녹음이 필요합니다.</Text>
                        )}
                        <Text type="supporting">판정이 불안정하면 같은 사람의 다른 날·거리·마이크 샘플을 추가한 뒤 다시 시험해 보세요.</Text>
                        {identification.verification?.recorded && !speakerProbeCanBecomeSample(identification) && (
                          <Text type="supporting">별도 녹음 검증은 기록했습니다. 이 파일을 등록 표본으로도 사용하려면 말소리가 5초 이상 필요합니다.</Text>
                        )}
                        {speakerProbeCanBecomeSample(identification) && expectedSpeakerId && identificationFile && (
                          <Stack direction="horizontal" justify="end">
                            <Button
                              label="이 검증 음성을 표본에 추가"
                              variant="secondary"
                              size="sm"
                              onClick={promoteIdentificationSample}
                              isLoading={busy}
                            />
                          </Stack>
                        )}
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
              <Stack gap={4} width={desktop ? "var(--layout-dashboard-panel-width)" : "100%"} style={{ flex: "none" }}>
                <Card padding={4}>
                  <Stack gap={3}>
                    <Stack direction="horizontal" justify="between" align="center">
                      <Heading level={3}>음성 식별 상태</Heading>
                      <StatusDot
                        variant={recording.services.speakerModelState === "ready" ? "success" : recording.services.speakerModelState === "failed" ? "error" : "warning"}
                        label={recording.services.speakerModelState === "ready" ? "화자 모델 준비됨" : recording.services.speakerModelState === "failed" ? "화자 모델 오류" : "화자 모델 준비 중"}
                      />
                    </Stack>
                    <List hasDividers density="compact">
                      <ListItem label="등록 화자" endContent={<Text type="code">{recording.speakers.length}명</Text>} />
                      <ListItem label="별도 녹음 검증" endContent={<Text type="code">{recording.speakers.filter(({ crossSessionVerificationCount, verificationSuccessCount }) => (crossSessionVerificationCount || verificationSuccessCount || 0) > 0).length}명</Text>} />
                      <ListItem label="생체정보 저장" endContent={<Token label={recording.services.biometricEncryption ? "암호화" : "개발 모드"} color={recording.services.biometricEncryption ? "green" : "yellow"} size="sm" />} />
                    </List>
                  </Stack>
                </Card>
                <Card padding={4} variant="muted">
                  <Stack gap={3}>
                    <Heading level={3}>내 설명 기준</Heading>
                    <Text type="supporting">회의 용어는 이 역할과 이미 아는 개념을 기준으로 개인화됩니다.</Text>
                    <Stack direction="horizontal" gap={2} wrap="wrap">
                      {(context.user.roles || []).length
                        ? context.user.roles.map((role) => <Token key={role} label={role} color="teal" size="sm" />)
                        : <Token label="일반 업무" color="default" size="sm" />}
                    </Stack>
                    <Text type="supporting">아는 개념 {(context.user.vocabulary?.knownTerms || []).length}개</Text>
                  </Stack>
                </Card>
                <Banner status="info" title="음성 프로필은 조직 전용입니다." description="등록된 음성은 현재 조직 안의 화자 식별에만 사용되며, 지식 상태는 본인에게만 표시됩니다." />
              </Stack>
            </Stack>
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
  const { compact, reducedMotion } = useViewport();
  const [page, setPage] = useState(() => workspacePageFromPath(window.location.pathname));
  const [vocabularyTerms, setVocabularyTerms] = useState([]);
  const [billing, setBilling] = useState(null);
  const [roomCode, setRoomCode] = useState(() => {
    const requestedCode = new URLSearchParams(window.location.search).get("room")?.toUpperCase();
    return /^[A-Z0-9]{4}$/.test(requestedCode || "") ? requestedCode : "A7K2";
  });
  const [meetingEntryPhase, setMeetingEntryPhase] = useState("idle");
  const meetingEntryTimersRef = useRef([]);
  const recording = useRecording();
  const navItems = [
    ["home", "홈", "calendar"],
    ["record", "실시간 기록", "microphone"],
    ["documents", "회의 문서", "search"],
    ["dictionary", "용어 사전", "info"],
    ["settings", "설정", "wrench"]
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

  useEffect(() => {
    let cancelled = false;
    apiRequest("/api/billing")
      .then((result) => { if (!cancelled) setBilling(result); })
      .catch(() => { if (!cancelled) setBilling(null); });
    return () => { cancelled = true; };
  }, [context.organization.id, recording.meetings.length, recording.speakers.length]);

  useEffect(() => () => {
    meetingEntryTimersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    const handleHistoryNavigation = () => {
      meetingEntryTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      meetingEntryTimersRef.current = [];
      setMeetingEntryPhase("idle");
      setPage(workspacePageFromPath(window.location.pathname));
    };
    window.addEventListener("popstate", handleHistoryNavigation);
    return () => window.removeEventListener("popstate", handleHistoryNavigation);
  }, []);

  useEffect(() => {
    if (!window.voicePartitionDesktop?.setMeetingMode) return;
    Promise.resolve(window.voicePartitionDesktop.setMeetingMode(page === "record")).catch(() => undefined);
  }, [page]);

  const navigateTo = useCallback((nextPage) => {
    const path = workspacePathForPage(nextPage);
    if (window.location.pathname !== path) window.history.pushState({ page: nextPage }, "", path);
    setPage(nextPage);
  }, []);

  const beginMeetingEntry = (prepare, nextRoomCode) => {
    if (meetingEntryPhase !== "idle") return;
    const normalizedRoomCode = String(nextRoomCode || "A7K2").toUpperCase();
    meetingEntryTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    meetingEntryTimersRef.current = [];
    setRoomCode(normalizedRoomCode);
    prepare();
    setMeetingEntryPhase(reducedMotion ? "loading" : "exiting");

    if (!reducedMotion) {
      meetingEntryTimersRef.current.push(window.setTimeout(() => setMeetingEntryPhase("loading"), 520));
    }
    meetingEntryTimersRef.current.push(window.setTimeout(() => {
      navigateTo("record");
      setMeetingEntryPhase("idle");
      meetingEntryTimersRef.current = [];
    }, reducedMotion ? 360 : 1280));
  };

  const startNewMeeting = (nextRoomCode = roomCode) => beginMeetingEntry(
    () => recording.resetMeeting(),
    nextRoomCode
  );
  const openMeeting = (meeting) => beginMeetingEntry(
    () => recording.openMeeting(meeting),
    meetingRoomCode(meeting)
  );

  const navigation = (
    <TopNav
      label="주요 화면"
      heading={(
        <TopNavHeading
          logo={(
            <Stack width={36} height={36} align="center" justify="center" style={{ color: "var(--brand-ink)", background: "var(--brand-mint)", borderRadius: "var(--radius-element)" }}>
              <Icon icon="microphone" color="inherit" label="보이스 파티션" />
            </Stack>
          )}
          heading="보이스 파티션"
          subheading={compact ? undefined : context.organization.name}
        />
      )}
      startContent={navItems.map(([value, label, icon]) => (
        <TopNavItem
          key={value}
          label={label}
          href={workspacePathForPage(value)}
          icon={<Icon icon={icon} color="inherit" />}
          isSelected={page === value}
          onClick={(event) => {
            event.preventDefault();
            navigateTo(value);
          }}
        />
      ))}
      endContent={(
        <Stack direction="horizontal" gap={1} align="center">
          {!compact && <Button label={`${billing?.subscription?.planId || "FREE"} 플랜`} variant="ghost" size="sm" onClick={() => navigateTo("billing")} />}
          <IconButton label="내 설정" icon={<Icon icon="wrench" />} variant="ghost" size="md" onClick={() => navigateTo("settings")} />
          <Avatar name={context.user.name} size="sm" />
        </Stack>
      )}
    />
  );

  let content;
  if (page === "home") {
    const dashboard = <DashboardPage context={context} recording={recording} onStart={startNewMeeting} onOpen={openMeeting} onNavigate={navigateTo} onLogout={onLogout} entryPhase={meetingEntryPhase} />;
    content = (
      <Stack height="100%" data-meeting-entry-stage style={{ position: "relative", overflow: "hidden", background: "var(--brand-cream)" }}>
        <Stack height="100%" aria-hidden={meetingEntryPhase === "idle"} style={{ visibility: meetingEntryPhase === "idle" ? "hidden" : "visible" }}>
            <MeetingEntryScreen roomCode={roomCode} />
        </Stack>
        {meetingEntryPhase !== "loading" && <Stack height="100%" style={{ position: "absolute", inset: 0 }}>{dashboard}</Stack>}
      </Stack>
    );
  }
  else if (page === "documents") content = <DocumentsPage meetings={recording.meetings} onOpen={openMeeting} onDelete={async (meetingId) => { await recording.removeMeeting(meetingId); await refreshVocabulary(); }} />;
  else if (page === "dictionary") content = <DictionaryPage terms={vocabularyTerms} onRefresh={refreshVocabulary} />;
  else if (page === "billing") content = <BillingPage context={context} onBillingChange={setBilling} />;
  else if (page === "settings") content = <SettingsPage context={context} recording={recording} billing={billing} onOpenBilling={() => navigateTo("billing")} />;
  else content = <MeetingPage recording={recording} billing={billing} onOpenBilling={() => navigateTo("billing")} onLeave={() => navigateTo("home")} roomCode={roomCode} user={context.user} />;

  if (page === "home" || page === "record") return <AppShell variant="surface" height="fill" contentPadding={0} style={{ background: page === "home" ? "var(--brand-cream)" : undefined }}>{content}</AppShell>;
  return <AppShell topNav={navigation} variant="surface" height="fill" contentPadding={0} mobileNav={{ breakpoint: "md" }}>{content}</AppShell>;
}

export default function App() {
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState(null);

  const loadSession = useCallback(async () => {
    setLoading(true);
    setSessionError(null);
    try {
      setContext(await apiRequest("/api/session"));
    } catch (error) {
      if (error.status === 401) setContext(null);
      else setSessionError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSession(); }, [loadSession]);

  const logout = async () => {
    await apiRequest("/api/auth/logout", { method: "POST" });
    window.history.replaceState(null, "", "/");
    setContext(null);
  };

  if (loading) {
    return (
      <AppShell variant="surface" height="fill" contentPadding={0}>
        <Center width="100%" height="100%" padding={6} style={{ background: "var(--brand-cream)" }}>
          <Stack align="center" gap={5}>
            <Stack width="calc(var(--spacing-10) + var(--spacing-4))" height="calc(var(--spacing-10) + var(--spacing-4))" align="center" justify="center" style={{ background: "var(--brand-mint)", color: "var(--brand-ink)", borderRadius: "var(--radius-container)" }}>
              <Icon icon="microphone" color="inherit" label="보이스 파티션" size="lg" />
            </Stack>
            <Stack align="center" gap={2}>
              <Heading level={1}>보이스 파티션</Heading>
              <Spinner size="lg" label="워크스페이스를 불러오는 중입니다" />
            </Stack>
          </Stack>
        </Center>
      </AppShell>
    );
  }
  if (sessionError) return <ServiceConnectionScreen error={sessionError} onRetry={loadSession} isRetrying={loading} />;
  if (!context?.authenticated && !context?.user) return <AuthScreen onAuthenticated={setContext} />;
  if (!context.organization) return <OrganizationSetup context={context} onChange={setContext} />;
  if (!context.user.vocabulary?.onboardedAt) return <VocabularyOnboarding context={context} onChange={setContext} />;
  return <Workspace context={context} onContextChange={setContext} onLogout={logout} />;
}
