export default function ProgressBar({
  value = 0,
  max = 100,
  color = '#818cf8',
  showLabel = false,
  label = '',
  className = '',
}) {
  const percentage = Math.min(Math.round((value / max) * 100), 100);

  return (
    <div className={className}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/50">{label}</span>
          <span className="text-xs font-semibold text-white/70">{percentage}%</span>
        </div>
      )}
      <progress 
        className="w-full h-2 rounded-full overflow-hidden appearance-none bg-white/5 [&::-webkit-progress-bar]:bg-white/5 [&::-webkit-progress-value]:transition-all [&::-webkit-progress-value]:duration-1000 [&::-moz-progress-bar]:transition-all [&::-moz-progress-bar]:duration-1000"
        value={value} 
        max={max}
        style={{
          '--progress-color': color,
        }}
      />
      <style>{`
        progress::-webkit-progress-value { background: var(--progress-color); box-shadow: 0 0 10px var(--progress-color); border-radius: 9999px; }
        progress::-moz-progress-bar { background: var(--progress-color); box-shadow: 0 0 10px var(--progress-color); border-radius: 9999px; }
      `}</style>
    </div>
  );
}
