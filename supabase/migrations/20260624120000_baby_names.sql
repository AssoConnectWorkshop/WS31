create table if not exists baby_names (
  id bigint generated always as identity primary key,
  name text not null,
  gender text not null check (gender in ('M', 'F', 'MF')),
  origin text not null,
  meaning text not null,
  style text not null check (style in ('classique', 'moderne', 'original'))
);

insert into baby_names (name, gender, origin, meaning, style) values
-- Garçons classiques
('Louis', 'M', 'Germanique', 'Guerrier glorieux', 'classique'),
('Pierre', 'M', 'Grec', 'Rocher, solide', 'classique'),
('Henri', 'M', 'Germanique', 'Maître de la maison', 'classique'),
('Julien', 'M', 'Latin', 'Descendant de Jules', 'classique'),
('Antoine', 'M', 'Latin', 'Inestimable', 'classique'),
('Thomas', 'M', 'Araméen', 'Jumeau', 'classique'),
('Nicolas', 'M', 'Grec', 'Victoire du peuple', 'classique'),
('François', 'M', 'Latin', 'Homme libre', 'classique'),
('Charles', 'M', 'Germanique', 'Homme libre', 'classique'),
('Mathieu', 'M', 'Hébreu', 'Don de Dieu', 'classique'),

-- Garçons modernes
('Lucas', 'M', 'Latin', 'Lumière', 'moderne'),
('Nathan', 'M', 'Hébreu', 'Il a donné', 'moderne'),
('Théo', 'M', 'Grec', 'Don de Dieu', 'moderne'),
('Hugo', 'M', 'Germanique', 'Intelligence, esprit', 'moderne'),
('Maxime', 'M', 'Latin', 'Le plus grand', 'moderne'),
('Raphaël', 'M', 'Hébreu', 'Dieu guérit', 'moderne'),
('Gabriel', 'M', 'Hébreu', 'Force de Dieu', 'moderne'),
('Noah', 'M', 'Hébreu', 'Repos, paix', 'moderne'),
('Ethan', 'M', 'Hébreu', 'Solide, fort', 'moderne'),
('Liam', 'M', 'Irlandais', 'Volonté forte', 'moderne'),

-- Garçons originaux
('Axel', 'M', 'Hébreu', 'Père de la paix', 'original'),
('Eliott', 'M', 'Hébreu', 'Mon Dieu est Yahvé', 'original'),
('Milo', 'M', 'Latin', 'Soldat, gracieux', 'original'),
('Côme', 'M', 'Grec', 'Ordre, beauté', 'original'),
('Sohan', 'M', 'Sanskrit', 'Beau, charmant', 'original'),
('Timéo', 'M', 'Grec', 'Honorer Dieu', 'original'),
('Soren', 'M', 'Nordique', 'Sévère, strict', 'original'),
('Leandro', 'M', 'Grec', 'Lion homme', 'original'),
('Orion', 'M', 'Grec', 'Chasseur céleste', 'original'),
('Bastien', 'M', 'Grec', 'Vénérable', 'original'),

-- Filles classiques
('Marie', 'F', 'Hébreu', 'Aimée, bien-aimée', 'classique'),
('Sophie', 'F', 'Grec', 'Sagesse', 'classique'),
('Camille', 'F', 'Latin', 'Servant les dieux', 'classique'),
('Claire', 'F', 'Latin', 'Brillante, claire', 'classique'),
('Julie', 'F', 'Latin', 'Descendante de Jules', 'classique'),
('Isabelle', 'F', 'Hébreu', 'Consacrée à Dieu', 'classique'),
('Charlotte', 'F', 'Germanique', 'Femme libre', 'classique'),
('Marguerite', 'F', 'Grec', 'Perle', 'classique'),
('Alice', 'F', 'Germanique', 'Noble', 'classique'),
('Hélène', 'F', 'Grec', 'Lumière du soleil', 'classique'),

-- Filles modernes
('Emma', 'F', 'Germanique', 'Tout, universel', 'moderne'),
('Léa', 'F', 'Hébreu', 'Fatiguée, délicate', 'moderne'),
('Manon', 'F', 'Hébreu', 'Grace divine', 'moderne'),
('Chloé', 'F', 'Grec', 'Jeune pousse verte', 'moderne'),
('Inès', 'F', 'Grec', 'Pure, chaste', 'moderne'),
('Jade', 'F', 'Espagnol', 'Pierre précieuse verte', 'moderne'),
('Zoé', 'F', 'Grec', 'Vie', 'moderne'),
('Lucie', 'F', 'Latin', 'Lumière', 'moderne'),
('Pauline', 'F', 'Latin', 'Petite, humble', 'moderne'),
('Anaïs', 'F', 'Hébreu', 'Grâce de Dieu', 'moderne'),

-- Filles originales
('Alix', 'F', 'Germanique', 'Noble', 'original'),
('Céleste', 'F', 'Latin', 'Du ciel', 'original'),
('Maëlys', 'F', 'Celte', 'Princesse, chef', 'original'),
('Solène', 'F', 'Latin', 'Solennelle, sacrée', 'original'),
('Azalée', 'F', 'Grec', 'Fleur sèche', 'original'),
('Noor', 'F', 'Arabe', 'Lumière', 'original'),
('Sasha', 'F', 'Grec', 'Défenseuse de humanité', 'original'),
('Lena', 'F', 'Grec', 'Lumière', 'original'),
('Wren', 'F', 'Anglais', 'Petit oiseau', 'original'),
('Maia', 'F', 'Grec', 'Grande, mère', 'original'),

-- Mixtes classiques
('Dominique', 'MF', 'Latin', 'Du Seigneur', 'classique'),
('Claude', 'MF', 'Latin', 'Boiteux, de Claude', 'classique'),

-- Mixtes modernes
('Alexis', 'MF', 'Grec', 'Défenseur', 'moderne'),
('Eden', 'MF', 'Hébreu', 'Plaisir, délice', 'moderne'),
('Charlie', 'MF', 'Germanique', 'Homme libre', 'moderne'),
('Lou', 'MF', 'Germanique', 'Guerrière glorieuse', 'moderne'),
('Robin', 'MF', 'Germanique', 'Brillant de gloire', 'moderne'),
('Morgan', 'MF', 'Celte', 'Né de la mer', 'moderne'),

-- Mixtes originaux
('Remy', 'MF', 'Latin', 'Rameur, de Reims', 'original'),
('Sacha', 'MF', 'Grec', 'Défenseur de humanité', 'original'),
('Ari', 'MF', 'Hébreu', 'Lion de Dieu', 'original'),
('River', 'MF', 'Anglais', 'Rivière', 'original');
