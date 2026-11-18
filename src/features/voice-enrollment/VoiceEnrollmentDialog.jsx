import React, { useCallback } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Section } from "@astryxdesign/core/Section";
import { Selector } from "@astryxdesign/core/Selector";
import { Stack } from "@astryxdesign/core/Stack";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { useVoiceEnrollmentCapture } from "./useVoiceEnrollmentCapture.js";
import { VOICE_ENROLLMENT_PASSAGE } from "./voiceEnrollmentState.js";

const WAVEFORM_BAR_COUNT = 36;

function VoiceWaveform({ levels = [], isActive = false }) {
  const visibleLevels = [...Array(Math.max(0, WAVEFORM_BAR_COUNT - levels.length)).fill(0), ...levels]
    .slice(-WAVEFORM_BAR_COUNT);

  return (
    <svg
      viewBox="0 0 360 96"
      width="100%"
      height="96"
      role="img"
      aria-label={isActive ? "실시간 마이크 음량 파형" : "녹음된 마이크 음량 파형"}
      data-voice-waveform
    >
      <title>{isActive ? "실시간 마이크 음량 파형" : "녹음된 마이크 음량 파형"}</title>
      {visibleLevels.map((level, index) => {
        const barHeight = Math.max(6, Math.round((Math.min(100, Math.max(0, level)) / 100) * 80));
        return (
          <rect
            key={`${index}-${level}`}
            x={index * 10 + 2}
            y={(96 - barHeight) / 2}
            width="6"
            height={barHeight}
            rx="3"
            fill={level > 0 ? "var(--color-accent)" : "var(--color-border)"}
          />
        );
      })}
    </svg>
  );
}

function storageStagePresentation(phase, stage) {
  const phaseOrder = { idle: -1, requesting: 0, recording: 0, stopping: 1, uploading: 1, success: 3, error: -1 };
  const current = phaseOrder[phase] ?? 0;
  if (current > stage) return { variant: "success", label: "완료" };
  if (current === stage) return { variant: "accent", label: "진행 중" };
  return { variant: "neutral", label: "대기" };
}

function StorageStage({ phase, stage, title, description }) {
  const state = storageStagePresentation(phase, stage);
  return (
    <Stack direction="horizontal" align="start" justify="between" gap={3}>
      <Stack gap={1}>
        <Text type="label">{title}</Text>
        <Text type="supporting" color="secondary">{description}</Text>
      </Stack>
      <Stack direction="horizontal" align="center" gap={1}>
        <StatusDot variant={state.variant} isPulsing={state.label === "진행 중"} />
        <Text type="supporting" color="secondary">{state.label}</Text>
      </Stack>
    </Stack>
  );
}

function phasePresentation(phase, permission) {
  if (phase === "requesting") return { variant: "warning", label: "마이크 권한 확인 중" };
  if (phase === "recording") return { variant: "accent", label: "목소리 녹음 중" };
  if (phase === "stopping") return { variant: "warning", label: "녹음 마무리 중" };
  if (phase === "uploading") return { variant: "warning", label: "목소리 등록 중" };
  if (phase === "success") return { variant: "success", label: "목소리 등록 완료" };
  if (phase === "error") return { variant: "error", label: "다시 확인이 필요합니다" };
  if (permission === "denied") return { variant: "error", label: "마이크 권한이 차단됨" };
  if (permission === "granted") return { variant: "success", label: "마이크 사용 가능" };
  return { variant: "neutral", label: "마이크 권한을 요청할 예정" };
}

function secondsLabel(seconds) {
  return `${Math.max(0, Math.ceil(seconds))}초`;
}

export function VoiceEnrollmentDialog({
  isOpen,
  onOpenChange,
  onEnroll,
  title = "내 목소리 등록",
  subtitle = "안내 문장을 평소 말하듯 읽으면 회의에서 내 발화를 구분할 수 있습니다.",
  targetSeconds = 12
}) {
  const capture = useVoiceEnrollmentCapture({ onEnroll, targetSeconds });
  const busy = ["requesting", "recording", "stopping", "uploading"].includes(capture.phase);
  const status = phasePresentation(capture.phase, capture.permission);

  const close = useCallback(() => {
    capture.reset();
    onOpenChange(false);
  }, [capture.reset, onOpenChange]);

  const handleOpenChange = useCallback((open) => {
    if (!open) close();
  }, [close]);

  const finish = useCallback(() => capture.stop({ upload: true }), [capture.stop]);
  const retry = useCallback(() => capture.start(), [capture.start]);

  const footer = capture.phase === "success" ? (
    <Section padding={3}>
      <Stack direction="horizontal" justify="end">
        <Button label="닫기" variant="primary" onClick={close} />
      </Stack>
    </Section>
  ) : (
    <Section padding={3}>
      <Stack direction="horizontal" justify="end" gap={2}>
        <Button label={busy ? "취소" : "닫기"} variant="secondary" onClick={close} />
        {capture.phase === "error" ? (
          <Button label="다시 녹음" variant="primary" onClick={retry} />
        ) : capture.phase === "recording" ? (
          <Button label="녹음 완료" variant="primary" onClick={finish} isDisabled={!capture.canFinish} />
        ) : (
          <Button
            label="녹음 시작"
            variant="primary"
            onClick={capture.start}
            isDisabled={busy || capture.audioInputs.length === 0}
            isLoading={capture.phase === "requesting" || capture.phase === "uploading"}
          />
        )}
      </Stack>
    </Section>
  );

  return (
    <Dialog isOpen={isOpen} onOpenChange={handleOpenChange} purpose="form" width={560} maxHeight="90vh">
      <Layout
        header={<DialogHeader title={title} subtitle={subtitle} onOpenChange={handleOpenChange} />}
        content={(
          <LayoutContent padding={4}>
            <Stack gap={4}>
              <Stack direction="horizontal" align="center" gap={2}>
                <StatusDot variant={status.variant} label={status.label} isPulsing={capture.phase === "recording"} />
                <Text type="supporting" color={capture.phase === "error" ? "error" : "secondary"}>{status.label}</Text>
              </Stack>

              {capture.phase !== "success" && (
                <Selector
                  label="사용할 마이크"
                  description="한 사람의 목소리만 들리는 조용한 환경을 권장합니다."
                  options={capture.audioInputs}
                  value={capture.selectedAudioInputId || undefined}
                  onChange={capture.setSelectedAudioInputId}
                  placeholder={capture.audioInputs.length ? "기본 마이크" : "연결된 마이크가 없습니다"}
                  isDisabled={busy}
                  width="100%"
                />
              )}

              {capture.phase !== "success" && (
                <Section variant="muted" padding={4}>
                  <Stack gap={2}>
                    <Text type="label">읽을 문장</Text>
                    <Text as="p" type="large">{VOICE_ENROLLMENT_PASSAGE}</Text>
                    <Text type="supporting" color="secondary">약 {capture.targetSeconds}초 동안 또렷하고 자연스럽게 읽어 주세요.</Text>
                  </Stack>
                </Section>
              )}

              {capture.phase === "recording" && (
                <Stack gap={3}>
                  <ProgressBar
                    label={`녹음 시간 · ${secondsLabel(capture.elapsed)} 지남 · ${secondsLabel(capture.remaining)} 남음`}
                    value={capture.elapsed}
                    max={capture.targetSeconds}
                    variant="accent"
                    hasValueLabel
                    formatValueLabel={() => secondsLabel(capture.remaining)}
                  />
                  <ProgressBar
                    label="실시간 마이크 입력 레벨"
                    value={capture.inputLevel}
                    max={100}
                    variant={capture.inputLevel > 90 ? "error" : capture.inputLevel < 20 ? "warning" : "success"}
                    hasValueLabel
                  />
                  <Text type="supporting" color="secondary">
                    {capture.canFinish ? "충분한 길이가 녹음되었습니다. 곧 자동으로 완료됩니다." : "최소 10초까지 문장을 이어서 읽어 주세요."}
                  </Text>
                </Stack>
              )}

              {capture.phase !== "idle" && capture.phase !== "requesting" && (
                <Section variant="muted" padding={3}>
                  <Stack gap={2}>
                    <Stack direction="horizontal" align="center" justify="between" gap={2}>
                      <Text type="label">목소리 시각화</Text>
                      <Text type="supporting" color="secondary">입력 레벨 {capture.inputLevel}%</Text>
                    </Stack>
                    <VoiceWaveform levels={capture.levelHistory} isActive={capture.phase === "recording"} />
                    <Text type="supporting" color="secondary">원본 음성 대신 최근 음량 값 36개만 화면에 표시합니다.</Text>
                  </Stack>
                </Section>
              )}

              <Section padding={3} data-voice-storage-flow>
                <Stack gap={3}>
                  <Text type="label">저장 과정</Text>
                  <StorageStage
                    phase={capture.phase}
                    stage={0}
                    title="브라우저에서 녹음"
                    description="녹음 중 메모리에만 임시 보관하며 브라우저 저장소에는 남기지 않습니다."
                  />
                  <StorageStage
                    phase={capture.phase}
                    stage={1}
                    title="서버에서 음질 분석"
                    description="16 kHz 단일 채널 음성으로 변환해 길이·음량·말소리·잡음을 확인합니다."
                  />
                  <StorageStage
                    phase={capture.phase}
                    stage={2}
                    title="내 목소리 프로필 저장"
                    description="화자 임베딩과 제한된 참조 음성을 계정 소유 데이터로 암호화해 저장합니다."
                  />
                </Stack>
              </Section>

              {["requesting", "stopping", "uploading"].includes(capture.phase) && (
                <ProgressBar
                  label={capture.phase === "uploading" ? "녹음된 목소리를 등록하고 있습니다" : "마이크 녹음을 준비하고 있습니다"}
                  isIndeterminate
                />
              )}

              {capture.phase === "error" && (
                <Section variant="muted" padding={3}>
                  <Text as="p" color="error">{capture.error}</Text>
                </Section>
              )}

              {capture.phase === "success" && (
                <Section variant="muted" padding={4}>
                  <Stack gap={2} align="center">
                    <Text type="large" weight="semibold">등록을 마쳤습니다</Text>
                    <Text as="p" color="secondary" justify="center">이제 회의에서 등록한 이름으로 내 목소리를 구분할 수 있습니다.</Text>
                  </Stack>
                </Section>
              )}
            </Stack>
          </LayoutContent>
        )}
        footer={<LayoutFooter hasDivider>{footer}</LayoutFooter>}
      />
    </Dialog>
  );
}
