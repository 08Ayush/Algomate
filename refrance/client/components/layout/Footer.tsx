export default function Footer() {
  return (
    <footer className="border-t bg-background/50">
      <div className="container mx-auto py-8 text-sm text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>© {new Date().getFullYear()} The Academic Compass. All rights reserved.</p>
        <p className="flex gap-4">
          <a href="#architecture" className="hover:text-foreground">Architecture</a>
          <a href="#stack" className="hover:text-foreground">Stack</a>
          <a href="#schema" className="hover:text-foreground">Schema</a>
        </p>
      </div>
    </footer>
  );
}
