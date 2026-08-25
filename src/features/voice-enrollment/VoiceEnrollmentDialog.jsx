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
