import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <title>FLOWIN</title>
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: htmlStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const htmlStyles = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css');

  *, *::before, *::after { box-sizing: border-box; }

  html, body {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    background-color: #06060D;
    overflow-x: hidden;
  }

  #root {
    display: flex;
    width: 100%;
    min-height: 100%;
    align-items: center;
    justify-content: center;
    background:
      radial-gradient(ellipse 60% 50% at 20% 20%, rgba(124,110,232,0.07) 0%, transparent 60%),
      radial-gradient(ellipse 50% 40% at 80% 80%, rgba(45,212,191,0.05) 0%, transparent 60%),
      #06060D;
  }

  /* React Native Web 내부 컨테이너 흰 배경 제거 */
  #root > div {
    width: 100%;
  }
`;
