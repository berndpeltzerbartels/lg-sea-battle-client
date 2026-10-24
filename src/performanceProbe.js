// Loaded only for an explicitly requested remote profiling run.
export async function createPerformanceProbe(scene) {
  const [{ SceneInstrumentation }, { EngineInstrumentation }] = await Promise.all([
    import('@babylonjs/core/Instrumentation/sceneInstrumentation.js'),
    import('@babylonjs/core/Instrumentation/engineInstrumentation.js'),
    import('@babylonjs/core/Engines/Extensions/engine.query.js')
  ]);
  const sceneStats = new SceneInstrumentation(scene);
  sceneStats.captureActiveMeshesEvaluationTime = true;
  sceneStats.captureRenderTime = true;
  sceneStats.captureAnimationsTime = true;
  sceneStats.captureRenderTargetsRenderTime = true;
  const engine = scene.getEngine();
  const engineStats = new EngineInstrumentation(engine);
  const gpuSupported = !!engine.getCaps().timerQuery;
  if (gpuSupported) engineStats.captureGPUFrameTime = true;
  const counter = value => value?.count ? Number(value.lastSecAverage.toFixed(3)) : null;
  return () => ({
    activeMeshEvaluationMs: counter(sceneStats.activeMeshesEvaluationTimeCounter),
    renderSubmissionMs: counter(sceneStats.renderTimeCounter),
    animationsMs: counter(sceneStats.animationsTimeCounter),
    renderTargetsMs: counter(sceneStats.renderTargetsRenderTimeCounter),
    gpuTimerSupported: gpuSupported,
    gpuFrameMs: gpuSupported && engineStats.gpuFrameTimeCounter?.count
      ? Number((engineStats.gpuFrameTimeCounter.lastSecAverage / 1e6).toFixed(3)) : null,
    totalMeshes: scene.meshes.length, totalLights: scene.lights.length
  });
}
