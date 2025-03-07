/* ID7: O aluno aplicou Pipes de maneira eficaz para formatar a apresentação de dados, 
garantindo que as informações exibidas sejam legíveis, esteticamente agradáveis e atendam 
aos requisitos de apresentação específicos para cada contexto. */

import { Pipe, PipeTransform } from '@angular/core';

export enum SocialMedia {
  Facebook = 'facebook',
  Instagram = 'instagram',
  Twitter = 'twitter',
  Whatsapp = 'whatsapp',
  Linkedin = 'linkedin',
  Youtubes = 'youtubes',
  Tiktok = 'tiktok'
}

@Pipe({
  name: 'socialIcon',
  standalone: true
})
export class SocialIconPipe implements PipeTransform {
  transform(value: SocialMedia): string {
    const icons = {
      [SocialMedia.Facebook]: 'assets/img/facebook.png',
      [SocialMedia.Instagram]: 'assets/img/instagram.png',
      [SocialMedia.Twitter]: 'assets/img/twitter.png',
      [SocialMedia.Whatsapp]: 'assets/img/whatsapp.png',
      [SocialMedia.Linkedin]: 'assets/img/linkedin.png',
      [SocialMedia.Youtubes]: 'assets/img/youtube.png',
      [SocialMedia.Tiktok]: 'assets/img/tiktok.png'
    };
    return icons[value] || 'assets/img/default.png'; 
  }
}
