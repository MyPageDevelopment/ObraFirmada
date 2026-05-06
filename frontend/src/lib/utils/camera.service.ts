/**
 * Servicio de captura de video/cámara
 * Utilidades para capturar imágenes de la cámara del dispositivo
 */

export class CameraService {
  /**
   * Solicita acceso a la cámara del dispositivo
   * SEGURIDAD: Requiere permiso explícito del usuario
   */
  static async requestCameraAccess(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });
      return stream;
    } catch (error) {
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Permiso de cámara denegado por el usuario');
        } else if (error.name === 'NotFoundError') {
          throw new Error('No se encontró cámara en el dispositivo');
        }
      }
      throw error;
    }
  }

  /**
   * Captura una foto desde un elemento de video
   * @param videoElement Elemento <video> con stream activo
   * @returns Imagen en Base64
   */
  static captureFrame(videoElement: HTMLVideoElement): string {
    const canvas = document.createElement('canvas');
    const maxWidth = 720;
    const maxHeight = 720;
    const videoWidth = videoElement.videoWidth || maxWidth;
    const videoHeight = videoElement.videoHeight || maxHeight;

    const scale = Math.min(maxWidth / videoWidth, maxHeight / videoHeight, 1);
    canvas.width = Math.round(videoWidth * scale);
    canvas.height = Math.round(videoHeight * scale);

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('No se pudo obtener contexto del canvas');
    }

    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // Convertir a Base64 (JPEG para comprimir)
    return canvas.toDataURL('image/jpeg', 0.75).split(',')[1];
  }

  /**
   * Detiene el stream de la cámara
   */
  static stopMediaStream(stream: MediaStream): void {
    stream.getTracks().forEach((track) => track.stop());
  }
}
