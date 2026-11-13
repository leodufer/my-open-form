import {
  Json,
  QuestionConfig,
  QuestionSegment,
  ReusableQuestion,
  ReusableQuestionInsert,
} from './database.types'

type ReusableConfig = ReusableQuestion['config']

/**
 * Extracts type-specific settings from a form QuestionConfig into the JSONB config shape
 * stored in `reusable_questions`.
 */
export function extractReusableConfig(question: QuestionConfig): ReusableConfig {
  const config: ReusableConfig = {}
  if (question.options !== undefined) config.options = question.options
  if (question.minValue !== undefined) config.minValue = question.minValue
  if (question.maxValue !== undefined) config.maxValue = question.maxValue
  if (question.allowedFileTypes !== undefined) config.allowedFileTypes = question.allowedFileTypes
  if (question.maxFileSize !== undefined) config.maxFileSize = question.maxFileSize
  if (question.placeholder !== undefined) config.placeholder = question.placeholder
  if (question.buttonText !== undefined) config.buttonText = question.buttonText
  return config
}

/**
 * Converts a form QuestionConfig into a `reusable_questions` insert payload.
 */
export function formQuestionToReusablePayload(
  question: QuestionConfig,
  userId: string
): ReusableQuestionInsert {
  return {
    user_id: userId,
    type: question.type,
    title: question.title.trim() || 'Pregunta sin título',
    description: question.description?.trim() || null,
    required: question.required,
    config: extractReusableConfig(question),
  }
}

/**
 * Converts a ReusableQuestion record into a QuestionConfig ready to be inserted into a form.
 */
export function reusableQuestionToFormQuestion(reusable: ReusableQuestion): QuestionConfig {
  const config = (reusable.config || {}) as ReusableConfig
  return {
    id: crypto.randomUUID(),
    reusableQuestionId: reusable.id,
    type: reusable.type,
    title: reusable.title,
    description: reusable.description ?? undefined,
    required: reusable.required,
    ...config,
  }
}

/**
 * Converts a QuestionSegment into an array of QuestionConfig items ready to be inserted into a form,
 * preserving segmentId and segmentQuestionId for cross-form response traceability.
 */
export function segmentToFormQuestions(segment: QuestionSegment): QuestionConfig[] {
  const segmentQuestions = (segment.questions as QuestionConfig[]) || []
  return segmentQuestions.map((sq) => ({
    ...sq,
    id: crypto.randomUUID(),
    segmentId: segment.id,
    segmentQuestionId: sq.id,
  }))
}

/**
 * Formats a JSON answer value into a human-readable Spanish string.
 */
export function formatReusableAnswer(answer: Json | undefined): string {
  if (answer === null || answer === undefined || answer === '') return '-'
  if (typeof answer === 'boolean') return answer ? 'Sí' : 'No'
  if (Array.isArray(answer)) return answer.length > 0 ? answer.join(', ') : '-'
  if (typeof answer === 'object') {
    const obj = answer as Record<string, unknown>
    if ('name' in obj && typeof obj.name === 'string') {
      return obj.name
    }
    return JSON.stringify(answer)
  }
  return String(answer)
}

