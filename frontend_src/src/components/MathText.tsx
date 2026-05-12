import katex from 'katex';

interface MathTextProps {
  text?: string | null;
  className?: string;
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

export default function MathText({ text, className }: MathTextProps) {
  if (!text) return null;

  if (looksLikeStandaloneMath(text)) {
    const html = renderMathHtml(text.trim(), true);
    return (
      <span
        className={className ? `${className} block overflow-x-auto` : 'block overflow-x-auto'}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span className={className}>
      {parseMathSegments(text).map((segment, index) => {
        if (segment.type === 'text') {
          return <span key={index}>{segment.value}</span>;
        }

        try {
          const html = renderMathHtml(segment.value, !!segment.display);

          return (
            <span
              key={index}
              className={segment.display ? 'block my-2 overflow-x-auto' : 'inline-block align-middle'}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return <code key={index}>{segment.value}</code>;
        }
      })}
    </span>
  );
}
