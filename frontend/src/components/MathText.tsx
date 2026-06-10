import katex from 'katex';

interface MathTextProps {
  text?: string | null;
  className?: string;
  /** Thu nhỏ công thức KaTeX theo font parent, giữ xuống dòng rõ ràng */
  compact?: boolean;
}

type Segment = {
  type: 'text' | 'math';
  value: string;
  display?: boolean;
};

const parseMathSegments = (value: string): Segment[] => {
  const segments: Segment[] = [];
  const pattern = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|&&[\s\S]+?&&|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: value.slice(lastIndex, match.index) });
    }

    const raw = match[0];
    const display = raw.startsWith('$$') || raw.startsWith('\\[');
    const math = raw.startsWith('$$')
      ? raw.slice(2, -2)
      : raw.startsWith('$')
        ? raw.slice(1, -1)
        : raw.startsWith('&&')
          ? raw.slice(2, -2)
          : raw.startsWith('\\[')
            ? raw.slice(2, -2)
            : raw.slice(2, -2);

    segments.push({ type: 'math', value: math.trim(), display });
    lastIndex = match.index + raw.length;
  }

  if (lastIndex < value.length) {
    segments.push({ type: 'text', value: value.slice(lastIndex) });
  }

  return segments;
};

const looksLikeStandaloneMath = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed || /[\n]/.test(trimmed)) return false;
  return /^\\[a-zA-Z]+/.test(trimmed) || /\\(frac|int|lim|sum|prod|sqrt|sin|cos|tan|ln|log|left|right|cdot|infty)\b/.test(trimmed);
};

const renderMathHtml = (value: string, displayMode: boolean) =>
  katex.renderToString(value, {
    displayMode,
    throwOnError: false,
    strict: false,
    output: 'html',
  });

const katexCompactClass =
  '[&_.katex]:!text-[1em] [&_.katex]:!leading-relaxed [&_.katex-display]:!text-[1em] [&_.katex-display]:!my-1';

/** Thêm khoảng trắng quanh delimiter toán để chữ không dính công thức */
const normalizeCompactSpacing = (text: string) =>
  text
    .replace(/([a-zA-ZÀ-ỹ0-9])(\${1,2})/g, '$1 $2')
    .replace(/(\${1,2})([a-zA-ZÀ-ỹ0-9])/g, '$1 $2')
    .replace(/([a-zA-ZÀ-ỹ0-9])(\\\()/g, '$1 $2')
    .replace(/(\\\))([a-zA-ZÀ-ỹ0-9])/g, '$1 $2');

function renderSegments(content: string, compact: boolean, keyPrefix = '') {
  return parseMathSegments(content).map((segment, index) => {
    const key = `${keyPrefix}-${index}`;

    if (segment.type === 'text') {
      return (
        <span key={key} className="whitespace-pre-wrap">
          {segment.value}
        </span>
      );
    }

    try {
      const isDisplay = !!segment.display;
      const html = renderMathHtml(segment.value, isDisplay);

      if (isDisplay) {
        return (
          <span
            key={key}
            className={
              compact
                ? `block w-full my-1 overflow-x-auto ${katexCompactClass}`
                : 'block my-2 overflow-x-auto'
            }
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }

      return (
        <span
          key={key}
          className={
            compact
              ? `inline-block align-middle mx-0.5 my-0.5 ${katexCompactClass}`
              : 'inline-block align-middle mx-0.5'
          }
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } catch {
      return <code key={key}>{segment.value}</code>;
    }
  });
}

function renderByLines(text: string, compact: boolean, className?: string) {
  const lines = text.split('\n');

  return (
    <div className={[className, 'space-y-1.5 leading-relaxed break-words'].filter(Boolean).join(' ')}>
      {lines.map((line, i) => (
        <div key={i} className="break-words">
          {line.trim() ? renderSegments(line, compact, `l${i}`) : <span className="block h-1" aria-hidden />}
        </div>
      ))}
    </div>
  );
}

export default function MathText({ text, className, compact = false }: MathTextProps) {
  if (!text) return null;

  const content = compact ? normalizeCompactSpacing(text) : text;

  if (looksLikeStandaloneMath(content)) {
    const html = renderMathHtml(content.trim(), !compact);
    return (
      <span
        className={
          compact
            ? [className, 'block my-1 overflow-x-auto break-words', katexCompactClass].filter(Boolean).join(' ')
            : className
              ? `${className} block overflow-x-auto`
              : 'block overflow-x-auto'
        }
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  if (compact) {
    if (content.includes('\n')) {
      return renderByLines(content, true, className);
    }
    return (
      <div className={[className, 'leading-relaxed break-words'].filter(Boolean).join(' ')}>
        {renderSegments(content, true)}
      </div>
    );
  }

  if (content.includes('\n')) {
    return renderByLines(content, false, className);
  }

  return (
    <span className={[className, 'leading-relaxed break-words'].filter(Boolean).join(' ')}>
      {renderSegments(content, false)}
    </span>
  );
}
